import asyncio
import base64
import io
import os
from typing import Any, Optional

from groq import Groq

from app.core.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_STT_MODEL,
)
from app.models.metrics import TranscriptionResult, WordTimestamp


def get_value_from_item(item: Any, name: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


class STTEngine:
    """Speech-to-Text engine.

    Primary: Groq Whisper (whisper-large-v3).
    Fallback: OpenRouter transcription (OpenAI-compatible) when OPENROUTER_API_KEY is set.
    On a primary failure the engine transparently retries via the fallback so the
    streaming session is never interrupted by a single provider error.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = GROQ_MODEL) -> None:
        self.api_key = api_key or GROQ_API_KEY or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set. Provide it via argument or environment variable.")
        self.model = model
        self.groq_client = Groq(api_key=self.api_key)
        self._openrouter_enabled = bool(OPENROUTER_API_KEY)

    async def transcribe_audio_bytes(
        self, audio_bytes: bytes, filename: str = "temp.wav"
    ) -> TranscriptionResult:
        try:
            return await self._transcribe_groq(audio_bytes, filename)
        except Exception:
            if self._openrouter_enabled:
                return await self._transcribe_openrouter(audio_bytes, filename)
            raise

    async def _transcribe_groq(self, audio_bytes: bytes, filename: str) -> TranscriptionResult:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename
        response: Any = await asyncio.to_thread(
            self.groq_client.audio.transcriptions.create,
            file=audio_file,
            model="whisper-large-v3",
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
        )
        return self._parse_response(response)

    async def _transcribe_openrouter(self, audio_bytes: bytes, filename: str) -> TranscriptionResult:
        import httpx

        fmt = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
        payload = {
            "model": OPENROUTER_STT_MODEL,
            "input_audio": {"data": base64.b64encode(audio_bytes).decode(), "format": fmt},
        }
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE_URL}/audio/transcriptions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        return TranscriptionResult(text=str(data.get("text", "") or ""), duration=0.0, words=[])

    def _parse_response(self, response: Any) -> TranscriptionResult:
        def get_value(name: str, default: Any = None) -> Any:
            if isinstance(response, dict):
                return response.get(name, default)
            return getattr(response, name, default)

        words = [
            WordTimestamp(
                word=get_value_from_item(word, "word", ""),
                start=float(get_value_from_item(word, "start", 0.0)),
                end=float(get_value_from_item(word, "end", 0.0)),
            )
            for word in (get_value("words", []) or [])
        ]
        return TranscriptionResult(
            text=str(get_value("text", "") or ""),
            duration=float(get_value("duration", 0.0) or 0.0),
            words=words,
        )
