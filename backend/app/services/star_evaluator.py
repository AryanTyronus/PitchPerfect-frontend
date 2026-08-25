from app.models.metrics import EvaluationResult, SpeechMetrics, SubScores, create_disqualified_evaluation
from app.services.transcript_norm import MIN_TRANSCRIPT_WORDS


def evaluate_locally(text: str, metrics: SpeechMetrics) -> EvaluationResult:
    words = text.strip().split()
    if len(words) < MIN_TRANSCRIPT_WORDS:
        return create_disqualified_evaluation(source="local")

    pace = max(0.0, 100.0 - abs(metrics.words_per_minute - 140.0) * 0.6)
    clarity = int(max(0.0, min(20.0, 20.0 - metrics.filler_ratio * 60.0)))
    relevance = int(max(0.0, min(20.0, len(words) / 8.0)))
    professionalism = int(max(0.0, min(20.0, 12.0 + metrics.energy_rms * 8.0)))
    structure = int(max(0.0, min(20.0, 6.0 + min(8.0, len(text.split(".")) * 2.0) + min(6.0, pace * 0.06))))
    impact = int(max(0.0, min(20.0, (clarity + structure) / 2)))
    sub_scores = SubScores(
        clarity=clarity,
        relevance=relevance,
        professionalism=professionalism,
        structure=structure,
        impact=impact,
    )
    return EvaluationResult(
        score=int(round(sub_scores.average() * 5)),
        disqualified=False,
        feedback="Local heuristic evaluation: LLM providers were unavailable. "
        "Scores are derived from speech metrics only and should be treated as a baseline.",
        sub_scores=sub_scores,
        source="local",
    )
