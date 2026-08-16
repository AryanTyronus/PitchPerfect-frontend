from fastapi import Header, HTTPException, status

from app.core.config import API_TOKEN


async def require_api_token(authorization: str | None = Header(default=None)) -> None:
    """Require a bearer token only when API_TOKEN is configured."""
    if not API_TOKEN:
        return
    expected = f"Bearer {API_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API token")
