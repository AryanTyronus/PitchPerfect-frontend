import math
import struct


def pcm_energy(audio_bytes: bytes, sample_width: int = 2) -> tuple[float, float]:
    """Return normalized RMS and peak for signed little-endian PCM bytes."""
    if sample_width != 2 or len(audio_bytes) < 2:
        return 0.0, 0.0
    values = struct.unpack(f"<{len(audio_bytes) // 2}h", audio_bytes[: len(audio_bytes) // 2 * 2])
    normalized = [abs(value) / 32768.0 for value in values]
    return (math.sqrt(sum(value * value for value in normalized) / len(normalized)), max(normalized, default=0.0))
