from app.models.metrics import EvaluationResult, MetricScore, SpeechMetrics

MIN_TRANSCRIPT_WORDS = 3


def evaluate_locally(text: str, metrics: SpeechMetrics) -> EvaluationResult:
    words = text.strip().split()
    if len(words) < MIN_TRANSCRIPT_WORDS:
        zero_metric = MetricScore(
            score=0.0,
            rationale="No coherent speech was detected in the recording.",
        )
        return EvaluationResult(
            overall_score=0.0,
            clarity=zero_metric,
            confidence=zero_metric,
            structure=zero_metric,
            strengths=[],
            improvements=["Record a clear answer of at least 3 seconds with audible speech."],
            source="local",
        )

    pace = max(0.0, 100.0 - abs(metrics.words_per_minute - 140.0) * 0.6)
    clarity = max(0.0, 100.0 - metrics.filler_ratio * 300.0)
    confidence = min(100.0, 55.0 + metrics.energy_rms * 45.0)
    structure = min(100.0, 45.0 + min(35.0, len(text.split(".")) * 8.0) + min(20.0, pace * 0.2))
    overall = round((clarity + confidence + structure) / 3, 1)
    return EvaluationResult(
        overall_score=overall,
        clarity=MetricScore(score=round(clarity, 1), rationale="Fewer filler words generally improve perceived clarity."),
        confidence=MetricScore(score=round(confidence, 1), rationale="Energy and steady delivery are used as local confidence signals."),
        structure=MetricScore(score=round(structure, 1), rationale="Sentence coverage and speaking pace provide a structure baseline."),
        strengths=["Speech was captured successfully."],
        improvements=["Replace filler words with deliberate pauses.", "Aim for a steady pace near 120-160 words per minute."],
    )
