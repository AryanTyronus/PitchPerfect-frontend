import asyncio
from typing import Any

from app.core.config import SUPABASE_KEY, SUPABASE_URL

TABLE_NAME = "sessions"

_client: Any = None
_initialized: bool = False


def _init_client() -> Any:
    global _client, _initialized
    if _initialized:
        return _client
    _initialized = True
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        from supabase import create_client

        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        # Missing package or bad credentials: degrade to in-memory only.
        _client = None
    return _client


def get_client() -> Any:
    return _init_client()


async def save_session(session_data: dict) -> dict | None:
    """Persist a session row. Returns the inserted row, or None if Supabase is unconfigured."""
    client = _init_client()
    if client is None:
        return None

    def _insert() -> Any:
        return client.table(TABLE_NAME).insert(session_data).execute()

    result = await asyncio.to_thread(_insert)
    data = getattr(result, "data", None)
    if data:
        return data[0]
    return session_data


async def get_user_sessions(user_id: str = "demo_user") -> list[dict]:
    """Fetch all sessions for a user, newest first. Returns [] if Supabase is unconfigured."""
    client = _init_client()
    if client is None:
        return []

    def _select() -> Any:
        return (
            client.table(TABLE_NAME)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

    result = await asyncio.to_thread(_select)
    return getattr(result, "data", []) or []


async def get_session_by_id(session_id: str, user_id: str = "demo_user") -> dict | None:
    """Fetch a single session row by id via a live SQL read.

    Returns the row dict, or None if Supabase is unconfigured or the row does not exist.
    """
    client = _init_client()
    if client is None:
        return None

    def _select() -> Any:
        return (
            client.table(TABLE_NAME)
            .select("*")
            .eq("session_id", session_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_select)
    data = getattr(result, "data", None)
    return data if data else None
