import re

from app.models.metrics import SpeechMetrics, TranscriptionResult, WordTimestamp
from app.services.audio_energy import pcm_energy

FILLER_WORDS = ("um", "uh", "like", "you know", "so", "actually", "basically")


def calculate_wpm(transcript: str, duration_seconds: float) -> float:
    """Words spoken per minute = total words / minutes. Returns 0 when duration is absent."""
    if duration_seconds <= 0:
        return 0.0
    word_count = len(transcript.split())
    minutes = duration_seconds / 60.0
    if minutes <= 0:
        return 0.0
    return round(word_count / minutes, 1)


def extract_filler_words(transcript: str) -> dict:
    """Count filler-word occurrences with whole-word/phrase matching (case-insensitive).

    Returns {"total": <int>, "breakdown": {<filler>: <count>, ...}}.
    """
    if not transcript:
        return {"total": 0, "breakdown": {}}
    text = transcript.lower()
    breakdown: dict[str, int] = {}
    for filler in FILLER_WORDS:
        count = len(re.findall(r"\b" + re.escape(filler) + r"\b", text))
        if count:
            breakdown[filler] = count
    return {"total": sum(breakdown.values()), "breakdown": breakdown}


def detect_pauses(words: list[WordTimestamp], pause_threshold: float = 1.5) -> list[dict]:
    """Find gaps between consecutive word end/start timestamps that exceed `pause_threshold`.

    Returns a list of {"duration", "start", "end"} dicts (seconds).
    """
    pauses: list[dict] = []
    for previous, current in zip(words, words[1:]):
        gap = current.start - previous.end
        if gap >= pause_threshold:
            pauses.append(
                {
                    "duration": round(gap, 3),
                    "start": round(previous.end, 3),
                    "end": round(current.start, 3),
                }
            )
    return pauses


def calculate_speech_metrics(result: TranscriptionResult, audio_bytes: bytes | None = None) -> SpeechMetrics:
    words = result.words
    filler = extract_filler_words(result.text)
    filler_count = filler["total"]
    count = len(words) or len(result.text.split())
    detected = detect_pauses(words, pause_threshold=0.5)
    rms, peak = pcm_energy(audio_bytes or b"")
    duration = result.duration
    total_pause = round(sum(p["duration"] for p in detected), 3)
    return SpeechMetrics(
        duration_seconds=duration,
        word_count=count,
        words_per_minute=calculate_wpm(result.text, duration),
        filler_word_count=filler_count,
        filler_ratio=(filler_count / count if count else 0.0),
        pause_count=len(detected),
        total_pause_seconds=total_pause,
        average_pause_seconds=(total_pause / len(detected) if detected else 0.0),
        energy_rms=rms,
        energy_peak=peak,
    )
