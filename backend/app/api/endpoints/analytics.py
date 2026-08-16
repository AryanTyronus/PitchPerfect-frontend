from fastapi import APIRouter

from app.api.endpoints.session import _sessions

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def summary() -> dict[str, float | int | None]:
    evaluations = [session.evaluation for session in _sessions.values() if session.evaluation]
    scores = [evaluation.overall_score for evaluation in evaluations]
    return {"session_count": len(_sessions), "evaluated_session_count": len(scores), "average_score": round(sum(scores) / len(scores), 1) if scores else None}
