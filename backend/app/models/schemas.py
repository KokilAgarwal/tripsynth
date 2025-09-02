from typing import Literal, Optional
from pydantic import BaseModel, Field


class Activity(BaseModel):
    time: Literal["morning", "afternoon", "evening"]
    name: str
    description: str
    estimated_cost: float = 0
    lat: Optional[float] = None
    lng: Optional[float] = None


class DayPlan(BaseModel):
    day: int
    date_label: str
    activities: list[Activity] = Field(default_factory=list)


class Itinerary(BaseModel):
    destination: str
    date_range: str
    total_budget: float
    budget_used: float
    num_days: int
    days: list[DayPlan] = Field(default_factory=list)


class PlannerTask(BaseModel):
    id: int
    description: str
    status: Literal["pending", "done"] = "pending"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: str
    reasoning: Optional[list[PlannerTask]] = None


class SessionData(BaseModel):
    session_id: str
    trip_name: str
    messages: list[ChatMessage] = Field(default_factory=list)
    itinerary: Optional[Itinerary] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatStreamEvent(BaseModel):
    type: Literal[
        "stage",
        "reasoning",
        "message",
        "itinerary",
        "error",
        "done",
    ]
    stage: Optional[Literal["planning", "worker"]] = None
    content: Optional[str] = None
    reasoning: Optional[list[PlannerTask]] = None
    itinerary: Optional[Itinerary] = None
    session_id: Optional[str] = None
    trip_name: Optional[str] = None
    error: Optional[str] = None
