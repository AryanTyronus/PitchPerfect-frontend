import re


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
