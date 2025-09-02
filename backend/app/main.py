import asyncio
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agents.graph import now_iso, run_planner, run_worker
from app.config import settings
from app.models.schemas import (
    ChatMessage,
    ChatRequest,
    ChatStreamEvent,
    SessionData,
)
from app.redis_client import delete_session, get_session, save_session

app = FastAPI(title="TripSynth API", version="1.0.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NewSessionResponse(BaseModel):
    session_id: str
    trip_name: str


@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.post("/api/sessions", response_model=NewSessionResponse)
async def create_session():
    session_id = str(uuid.uuid4())
    session = SessionData(
        session_id=session_id,
        trip_name="New Trip",
    )
    save_session(session)
    return NewSessionResponse(session_id=session_id, trip_name=session.trip_name)


@app.get("/api/sessions/{session_id}")
async def get_session_endpoint(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.delete("/api/sessions/{session_id}")
async def remove_session(session_id: str):
    delete_session(session_id)
    return {"ok": True}


@app.post("/api/chat")
async def chat_stream(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    session = get_session(session_id)
    if not session:
        session = SessionData(session_id=session_id, trip_name="New Trip")

    user_msg = ChatMessage(
        role="user",
        content=request.message,
        timestamp=now_iso(),
    )
    session.messages.append(user_msg)
    save_session(session)

    async def event_generator():
        def emit(event: ChatStreamEvent) -> str:
            return f"data: {event.model_dump_json()}\n\n"

        try:
            yield emit(ChatStreamEvent(type="stage", stage="planning", session_id=session_id))

            loop = asyncio.get_event_loop()
            tasks, _summary, agent_state = await loop.run_in_executor(
                None, run_planner, request.message, session
            )
            for t in tasks:
                t.status = "done"

            yield emit(ChatStreamEvent(type="stage", stage="worker", session_id=session_id))

            assistant_text, itinerary, trip_name = await loop.run_in_executor(
                None, run_worker, agent_state
            )

            assistant_msg = ChatMessage(
                role="assistant",
                content=assistant_text,
                timestamp=now_iso(),
                reasoning=tasks,
            )
            session.messages.append(assistant_msg)
            if itinerary:
                session.itinerary = itinerary
            if trip_name:
                session.trip_name = trip_name
            save_session(session)

            yield emit(
                ChatStreamEvent(
                    type="message",
                    content=assistant_text,
                    reasoning=tasks,
                    session_id=session_id,
                    trip_name=trip_name,
                )
            )

            if itinerary:
                yield emit(
                    ChatStreamEvent(
                        type="itinerary",
                        itinerary=itinerary,
                        session_id=session_id,
                        trip_name=trip_name,
                    )
                )

            yield emit(ChatStreamEvent(type="done", session_id=session_id))

        except Exception as e:
            yield emit(
                ChatStreamEvent(
                    type="error",
                    error=str(e),
                    session_id=session_id,
                )
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
