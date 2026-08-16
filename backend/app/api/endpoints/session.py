from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException

from app.models.feedback import FeedbackCreate, FeedbackRecord
from app.models.metrics import EvaluationResult, MetricScore, PauseInfo, TranscriptionResult
from app.models.session import (
    QuestionAnswer,
    SessionCreate,
    SessionOverview,
    SessionRecord,
)
from app.services.speech_metrics import (
    calculate_speech_metrics,
    detect_pauses,
    extract_filler_words,
)
from app.services.supabase import get_session_by_id, get_user_sessions, save_session

router = APIRouter(prefix="/sessions", tags=["sessions"])
_sessions: dict[UUID, SessionRecord] = {}
_feedback: dict[UUID, FeedbackRecord] = {}


def _aggregate(answers: list[QuestionAnswer]) -> EvaluationResult:
    evals = [a.evaluation for a in answers if a.evaluation]
    if not evals:
        return EvaluationResult(
            overall_score=0,
            clarity=MetricScore(score=0, rationale="No answers evaluated"),
            confidence=MetricScore(score=0, rationale="No answers evaluated"),
            structure=MetricScore(score=0, rationale="No answers evaluated"),
            strengths=[],
            improvements=[],
            source="local",
        )
    n = len(evals)
    avg = lambda key: sum(getattr(e, key).score for e in evals) / n
    overall = sum(e.overall_score for e in evals) / n
    strengths: list[str] = []
    improvements: list[str] = []
    for e in evals:
        strengths.extend(e.strengths or [])
        improvements.extend(e.improvements or [])
    return EvaluationResult(
        overall_score=round(overall, 1),
        clarity=MetricScore(score=round(avg("clarity"), 1), rationale="Averaged across questions"),
        confidence=MetricScore(score=round(avg("confidence"), 1), rationale="Averaged across questions"),
        structure=MetricScore(score=round(avg("structure"), 1), rationale="Averaged across questions"),
        strengths=strengths[:10],
        improvements=improvements[:10],
        source=evals[0].source,
    )


def _to_supabase_row(session: SessionRecord) -> dict:
    metrics = session.metrics
    evaluation = session.evaluation
    return {
        "session_id": str(session.id),
        "user_id": "demo_user",
        "created_at": session.created_at.isoformat(),
        "wpm_score": metrics.words_per_minute if metrics else None,
        "filler_count": metrics.filler_word_count if metrics else None,
        "eye_contact_score": None,
        "star_feedback": evaluation.model_dump() if evaluation else None,
        "questions": [qa.model_dump() for qa in session.questions],
    }


def _session_to_overview(session: SessionRecord) -> SessionOverview:
    return SessionOverview(
        id=str(session.id),
        title=session.title,
        score=session.evaluation.overall_score if session.evaluation else None,
        created_at=session.created_at,
        status="completed",
    )


def _row_to_overview(row: dict) -> SessionOverview:
    score = row.get("wpm_score")
    star = row.get("star_feedback")
    if isinstance(star, dict):
        score = star.get("overall_score", score)
    created_raw = row.get("created_at")
    created = datetime.fromisoformat(created_raw) if created_raw else datetime.utcnow()
    return SessionOverview(
        id=str(row.get("session_id")),
        title=row.get("title", "Interview practice"),
        score=score,
        created_at=created,
        status="completed",
    )


def _row_to_session(row: dict) -> SessionRecord:
    evaluation = None
    star = row.get("star_feedback")
    if isinstance(star, dict):
        evaluation = EvaluationResult.model_validate(star)
    created_raw = row.get("created_at")
    created = datetime.fromisoformat(created_raw) if created_raw else datetime.utcnow()
    questions: list[QuestionAnswer] = []
    raw_questions = row.get("questions")
    if isinstance(raw_questions, list):
        for item in raw_questions:
            if isinstance(item, dict):
                try:
                    questions.append(QuestionAnswer.model_validate(item))
                except Exception:
                    pass
    return SessionRecord(
        id=UUID(row["session_id"]),
        title=row.get("title", "Interview practice"),
        created_at=created,
        transcription=None,
        metrics=None,
        evaluation=evaluation,
        questions=questions,
    )


@router.post("", response_model=SessionRecord, status_code=201)
async def create_session(payload: SessionCreate) -> SessionRecord:
    session = SessionRecord(title=payload.title)

    if payload.questions:
        from app.services.llm_evaluator import evaluate_answer
        from app.services.transcript_norm import normalize_transcript

        answered = [q for q in payload.questions if (q.transcript or "").strip()]
        question_answers: list[QuestionAnswer] = []
        combined_parts: list[str] = []
        for q in answered:
            normalized = normalize_transcript(q.transcript)
            transcription = TranscriptionResult(
                text=normalized,
                duration=q.duration_seconds,
                words=q.words,
            )
            metrics = calculate_speech_metrics(transcription)
            evaluation = await evaluate_answer(transcription.text, metrics)
            filler = extract_filler_words(normalized)
            detected_pauses = detect_pauses(transcription.words)
            question_answers.append(
                QuestionAnswer(
                    question=q.question,
                    transcript=normalized,
                    metrics=metrics,
                    evaluation=evaluation,
                    wpm=round(metrics.words_per_minute, 1),
                    filler_word_count=filler["total"],
                    filler_breakdown=filler["breakdown"],
                    pause_count=len(detected_pauses),
                    pauses=[PauseInfo(**p) for p in detected_pauses],
                )
            )
            combined_parts.append(normalized)
        session.questions = question_answers
        combined = " ".join(combined_parts)
        if combined:
            session.transcription = TranscriptionResult(text=combined, duration=0.0, words=[])
            session.metrics = calculate_speech_metrics(session.transcription)
            session.evaluation = _aggregate(question_answers)
    elif payload.transcript:
        from app.services.llm_evaluator import evaluate_answer
        from app.services.transcript_norm import normalize_transcript

        normalized = normalize_transcript(payload.transcript)
        transcription = TranscriptionResult(text=normalized, duration=0.0, words=[])
        metrics = calculate_speech_metrics(transcription)
        evaluation = await evaluate_answer(transcription.text, metrics)
        session.transcription = transcription
        session.metrics = metrics
        session.evaluation = evaluation

    # Keep in memory for immediate retrieval (results page navigates here right away).
    _sessions[session.id] = session

    # Persist to Supabase. Fall back to in-memory on any persistence error
    # (e.g., table not provisioned yet) so the user-facing flow still works.
    try:
        await save_session(_to_supabase_row(session))
    except Exception as exc:
        import logging

        logging.getLogger("app.session").warning("Supabase persistence failed; using in-memory: %s", exc)

    return session


@router.get("", response_model=list[SessionOverview])
async def list_sessions() -> list[SessionOverview]:
    # Prefer the database; fall back to in-memory so the dashboard still works without Supabase.
    try:
        rows = await get_user_sessions()
        if rows:
            return [_row_to_overview(row) for row in rows]
    except Exception:
        pass
    return [_session_to_overview(session) for session in _sessions.values()]


@router.get("/{session_id}", response_model=SessionRecord)
async def get_session(session_id: UUID) -> SessionRecord:
    session = _sessions.get(session_id)
    if session is not None:
        return session
    try:
        row = await get_session_by_id(str(session_id))
        if row:
            return _row_to_session(row)
    except Exception:
        pass
    raise HTTPException(status_code=404, detail="Session not found")


@router.post("/{session_id}/feedback", response_model=FeedbackRecord, status_code=201)
async def create_feedback(session_id: UUID, payload: FeedbackCreate) -> FeedbackRecord:
    if session_id not in _sessions or payload.session_id != session_id:
        raise HTTPException(status_code=404, detail="Session not found")
    record = FeedbackRecord(id=uuid4(), **payload.model_dump())
    _feedback[record.id] = record
    return record
