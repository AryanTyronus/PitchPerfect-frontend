from fastapi import APIRouter, Depends

from app.api.endpoints import analytics, audio, interview, session
from app.core.security import require_api_token

api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_api_token)])
api_router.include_router(audio.router)
api_router.include_router(interview.router)
api_router.include_router(session.router)
api_router.include_router(analytics.router)
