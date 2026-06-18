import json
import redis
from app.config import settings
from app.models.schemas import SessionData

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.redis_url, decode_responses=True)
    return _client


def session_key(session_id: str) -> str:
    return f"tripsynth:session:{session_id}"


def get_session(session_id: str) -> SessionData | None:
    data = get_redis().get(session_key(session_id))
    if not data:
        return None
    return SessionData.model_validate_json(data)


def save_session(session: SessionData) -> None:
    get_redis().set(
        session_key(session.session_id),
        session.model_dump_json(),
        ex=86400 * 7,
    )


def delete_session(session_id: str) -> None:
    get_redis().delete(session_key(session_id))
