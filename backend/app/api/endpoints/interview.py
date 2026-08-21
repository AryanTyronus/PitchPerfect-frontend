from fastapi import APIRouter, HTTPException

from app.models.metrics import EvaluationResult, SpeechMetrics, TranscriptionResult
from app.services.llm_evaluator import evaluate_answer
from app.services.speech_metrics import calculate_speech_metrics
from app.services.transcript_norm import create_zero_evaluation, is_valid_transcript

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate(transcription: TranscriptionResult) -> EvaluationResult:
    if not is_valid_transcript(transcription.text):
        return create_zero_evaluation()

    metrics = calculate_speech_metrics(transcription)
    evaluation = await evaluate_answer(transcription.text, metrics)
    return evaluation.model_copy(
        update={"eye_contact_percentage": transcription.eye_contact_percentage}
    )


@router.post("/analyze", response_model=dict[str, object])
async def analyze(transcription: TranscriptionResult) -> dict[str, object]:
    if not is_valid_transcript(transcription.text):
        zero_eval = create_zero_evaluation()
        return {
            "transcription": transcription,
            "metrics": calculate_speech_metrics(transcription),
            "evaluation": zero_eval.model_copy(
                update={"eye_contact_percentage": transcription.eye_contact_percentage}
            ),
        }

    metrics: SpeechMetrics = calculate_speech_metrics(transcription)
    evaluation = await evaluate_answer(transcription.text, metrics)
    return {
        "transcription": transcription,
        "metrics": metrics,
        "evaluation": evaluation.model_copy(
            update={"eye_contact_percentage": transcription.eye_contact_percentage}
        ),
    }
