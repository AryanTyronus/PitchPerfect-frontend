import re

from app.models.metrics import EvaluationResult, MetricScore

MIN_TRANSCRIPT_WORDS = 3


def clean_text(text: str) -> str:
    """Light cleanup for live, per-chunk transcription (collapse/trim only)."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def normalize_transcript(text: str) -> str:
    """Normalize a full transcript so output is consistent across STT providers.

    - collapses whitespace
    - fixes the standalone lowercase 'i' pronoun
    - capitalizes the first character
    """
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return ""
    cleaned = re.sub(r"(?<![\w'])i(?!\w)", "I", cleaned)
    cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned


def is_valid_transcript(text: str) -> bool:
    """Check if transcript has meaningful content.

    Returns True if transcript has at least MIN_TRANSCRIPT_WORDS words
    and is not just whitespace or repetitive noise.
    """
    if not text or not text.strip():
        return False
    words = text.strip().split()
    if len(words) < MIN_TRANSCRIPT_WORDS:
        return False
    unique_words = set(w.lower() for w in words)
    if len(unique_words) < 2 and len(words) >= MIN_TRANSCRIPT_WORDS:
        return False
    return True


def create_zero_evaluation() -> EvaluationResult:
    """Create a zero-score evaluation for invalid/empty transcripts."""
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
        source="validation",
    )
