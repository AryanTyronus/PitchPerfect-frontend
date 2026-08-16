from fastapi import APIRouter

from app.models.metrics import EvaluationResult, SpeechMetrics, TranscriptionResult
from app.services.llm_evaluator import evaluate_answer
from app.services.speech_metrics import calculate_speech_metrics

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate(transcription: TranscriptionResult) -> EvaluationResult:
    metrics = calculate_speech_metrics(transcription)
    return await evaluate_answer(transcription.text, metrics)


@router.post("/analyze", response_model=dict[str, object])
async def analyze(transcription: TranscriptionResult) -> dict[str, object]:
    metrics: SpeechMetrics = calculate_speech_metrics(transcription)
    return {"transcription": transcription, "metrics": metrics, "evaluation": await evaluate_answer(transcription.text, metrics)}
