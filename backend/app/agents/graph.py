"""LangGraph two-agent system: Planner + Worker."""

import json
import re
from datetime import datetime, timezone
from typing import Any, TypedDict

from groq import Groq
from langgraph.graph import END, StateGraph

from app.config import settings
from app.models.schemas import ChatMessage, Itinerary, PlannerTask, SessionData
from app.tools import places_lookup, web_search


class AgentState(TypedDict, total=False):
    user_message: str
    conversation_history: list[dict]
    planner_tasks: list[dict]
    planner_summary: str
    search_queries: str
    search_results: list[str]
    itinerary_json: str
    assistant_message: str
    trip_name: str


def _groq_client() -> Groq:
    return Groq(api_key=settings.groq_api_key)


def _chat(system: str, user: str, history: list[dict] | None = None) -> str:
    messages = [{"role": "system", "content": system}]
    if history:
        for h in history[-10:]:
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user})

    client = _groq_client()
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.4,
        max_tokens=4096,
    )
    return response.choices[0].message.content or ""


PLANNER_SYSTEM = """You are the TripSynth Planner agent. Given a user's trip request and conversation history,
create a structured task list for the Worker agent to research and build a complete itinerary.

Output ONLY valid JSON with this shape:
{
  "trip_name": "Short trip title",
  "tasks": [
    {"id": 1, "description": "Research best attractions in ...", "status": "pending"},
    {"id": 2, "description": "Find budget-friendly accommodations in ...", "status": "pending"}
  ],
  "summary": "Brief 1-2 sentence plan overview for the user"
}

Create 4-8 specific, actionable tasks. Include destination research, activities, food, transport, and budget considerations.
For follow-up messages, re-plan the ENTIRE trip from scratch using full conversation context — do not patch individual days."""


WORKER_SYSTEM = """You are the TripSynth Worker agent. You have search results and place data from tools.
Build a complete day-by-day itinerary as JSON.

Output ONLY valid JSON with this shape:
{
  "destination": "City/Region name",
  "date_range": "e.g. Mar 1 – Mar 5, 2026",
  "total_budget": 50000,
  "budget_used": 42000,
  "num_days": 5,
  "days": [
    {
      "day": 1,
      "date_label": "Day 1 – Arrival",
      "activities": [
        {
          "time": "morning",
          "name": "Activity name",
          "description": "Short description",
          "estimated_cost": 500,
          "lat": 15.2993,
          "lng": 74.1240
        }
      ]
    }
  ]
}

Rules:
- Each day should have morning, afternoon, and evening activities where appropriate
- Use realistic INR costs for Indian destinations (or local currency for international)
- Include lat/lng coordinates (approximate is fine) for map pins
- budget_used should sum activity costs reasonably
- Rebuild the FULL itinerary on every request — never partial updates"""


def planner_node(state: AgentState) -> dict:
    history_text = ""
    if state["conversation_history"]:
        history_text = "\n".join(
            f"{h['role']}: {h['content']}" for h in state["conversation_history"][-8:]
        )

    prompt = f"""User request: {state['user_message']}

Conversation history:
{history_text or '(first message)'}

Create the planner task list."""

    raw = _chat(PLANNER_SYSTEM, prompt)
    parsed = _extract_json(raw)

    tasks = parsed.get("tasks", [])
    return {
        "planner_tasks": tasks,
        "planner_summary": parsed.get("summary", "Planning your trip..."),
        "trip_name": parsed.get("trip_name", "My Trip"),
    }


def worker_plan_searches(state: AgentState) -> dict:
    """Determine what searches to run based on planner tasks."""
    tasks_desc = "\n".join(t["description"] for t in state["planner_tasks"])
    prompt = f"""Based on these planning tasks:
{tasks_desc}

User request: {state['user_message']}

List 3-5 specific search queries (one per line, no numbering) for web search and places lookup.
Format each line as: SEARCH: <query> or PLACES: <query>"""

    raw = _chat(
        "You output search queries only, one per line, prefixed with SEARCH: or PLACES:",
        prompt,
    )
    return {"search_queries": raw}


def worker_execute_tools(state: AgentState) -> dict:
    raw_queries = state.get("search_queries", "")
    results: list[str] = []

    for line in raw_queries.split("\n"):
        line = line.strip()
        if line.upper().startswith("SEARCH:"):
            q = line[7:].strip()
            if q:
                results.append(f"[Web Search: {q}]\n{web_search(q)}")
        elif line.upper().startswith("PLACES:"):
            q = line[7:].strip()
            if q:
                results.append(f"[Places: {q}]\n{places_lookup(q, state.get('trip_name', ''))}")

    if not results:
        destination = state.get("trip_name", "trip destination")
        results.append(f"[Web Search: {destination} travel guide]\n{web_search(f'{destination} travel guide attractions budget')}")
        results.append(f"[Places: top attractions]\n{places_lookup(f'top attractions {destination}', destination)}")

    return {"search_results": results}


def worker_build_itinerary(state: AgentState) -> dict:
    search_text = "\n\n".join(state.get("search_results", []))
    tasks_text = json.dumps(state.get("planner_tasks", []), indent=2)

    prompt = f"""User request: {state['user_message']}

Planner tasks:
{tasks_text}

Research results:
{search_text}

Build the complete itinerary JSON."""

    raw = _chat(WORKER_SYSTEM, prompt)
    itinerary_data = _extract_json(raw)

    assistant_prompt = f"""The user asked: {state['user_message']}

You created this itinerary for {itinerary_data.get('destination', 'their destination')}.
Write a friendly 2-4 sentence message summarizing the trip plan and highlighting 1-2 highlights.
Do not include JSON."""

    assistant_message = _chat(
        "You are a helpful travel assistant. Be warm and concise.",
        assistant_prompt,
    )

    return {
        "itinerary_json": json.dumps(itinerary_data),
        "assistant_message": assistant_message,
    }


def _extract_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return {}


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("planner", planner_node)
    graph.add_node("plan_searches", worker_plan_searches)
    graph.add_node("execute_tools", worker_execute_tools)
    graph.add_node("build_itinerary", worker_build_itinerary)

    graph.set_entry_point("planner")
    graph.add_edge("planner", "plan_searches")
    graph.add_edge("plan_searches", "execute_tools")
    graph.add_edge("execute_tools", "build_itinerary")
    graph.add_edge("build_itinerary", END)

    return graph.compile()


def _init_state(user_message: str, session: SessionData) -> AgentState:
    history = [{"role": m.role, "content": m.content} for m in session.messages]
    return {
        "user_message": user_message,
        "conversation_history": history,
        "planner_tasks": [],
        "planner_summary": "",
        "search_results": [],
        "itinerary_json": "",
        "assistant_message": "",
        "trip_name": session.trip_name,
    }


def run_planner(user_message: str, session: SessionData) -> tuple[list[PlannerTask], str, AgentState]:
    """Phase 1: Planner agent creates the task list."""
    state = _init_state(user_message, session)
    result = planner_node(state)
    state.update(result)

    tasks = [PlannerTask(**t) for t in state.get("planner_tasks", [])]
    return tasks, state.get("planner_summary", ""), state


def run_worker(state: AgentState) -> tuple[str, Itinerary | None, str]:
    """
    Phase 2: Worker agent searches and builds the full itinerary.

    On any follow-up, the Worker re-plans the full itinerary using full context
    rather than patching individual days — this is intentional for consistency
    and to avoid conflicting partial edits across the plan.
    """
    search_plan = worker_plan_searches(state)
    state.update(search_plan)

    tool_results = worker_execute_tools(state)
    state.update(tool_results)

    final = worker_build_itinerary(state)
    state.update(final)

    itinerary = None
    try:
        data = json.loads(final["itinerary_json"])
        if data.get("days"):
            itinerary = Itinerary.model_validate(data)
    except Exception:
        pass

    return final["assistant_message"], itinerary, state.get("trip_name", "My Trip")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
