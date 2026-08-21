from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from app.models.metrics import SpeechMetrics, TranscriptionResult
from app.services.speech_metrics import calculate_speech_metrics
from app.services.stt_engine import STTEngine
from app.services.transcript_norm import clean_text

router = APIRouter(prefix="/audio", tags=["audio"])
_stt_engine: STTEngine | None = None

MIN_AUDIO_DURATION_SECONDS = 3.0
MIN_AUDIO_BYTES = 1024


def get_stt_engine() -> STTEngine:
    global _stt_engine
    if _stt_engine is None:
        _stt_engine = STTEngine()
    return _stt_engine


def validate_audio_duration(audio_bytes: bytes, filename: str) -> float:
    """Estimate audio duration from file size. Returns duration in seconds."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
    if ext == "wav":
        return len(audio_bytes) / 32000.0
    return len(audio_bytes) / 16000.0


@router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_audio(file: UploadFile = File(...)) -> TranscriptionResult:
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty")

    if len(audio_bytes) < MIN_AUDIO_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Audio file too small. Please record at least 3 seconds of audio.",
        )

    estimated_duration = validate_audio_duration(audio_bytes, file.filename or "temp.wav")
    if estimated_duration < MIN_AUDIO_DURATION_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"Audio too short ({estimated_duration:.1f}s). Please record at least {MIN_AUDIO_DURATION_SECONDS} seconds.",
        )

    return await get_stt_engine().transcribe_audio_bytes(audio_bytes, file.filename or "temp.wav")


@router.post("/metrics", response_model=SpeechMetrics)
async def calculate_metrics(result: TranscriptionResult) -> SpeechMetrics:
    return calculate_speech_metrics(result)


async def audio_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        engine = get_stt_engine()
    except Exception:
        # STT provider not configured (e.g. missing GROQ_API_KEY). Tell the
        # client transcription is unavailable instead of dropping the socket.
        await websocket.send_json({"type": "error", "message": "transcription unavailable"})
        await websocket.close()
        return
    try:
        while True:
            try:
                audio_chunk = await websocket.receive_bytes()
            except WebSocketDisconnect:
                return
            if not audio_chunk:
                continue
            try:
                result = await engine.transcribe_audio_bytes(audio_chunk, "chunk.wav")
            except Exception:
                # Transient failure (e.g. Groq rate-limit/429). Keep the session
                # alive: tell the client transcription is momentarily unavailable
                # and skip this chunk instead of tearing down the connection.
                await websocket.send_json({"type": "error", "message": "transcription unavailable"})
                continue
            text = (result.text or "").strip()
            # Never surface API/parsing errors as if they were transcribed speech.
            if not text or text.lower().startswith("error") or "this model does not support" in text.lower():
                await websocket.send_json({"type": "error", "message": "transcription unavailable"})
                continue
            payload = result.model_dump(mode="json")
            payload["type"] = "partial"
            payload["text"] = clean_text(text)
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        return
