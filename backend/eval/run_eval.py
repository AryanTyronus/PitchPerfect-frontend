"""Small smoke evaluator for local metric behavior."""
from app.models.metrics import TranscriptionResult
from app.services.speech_metrics import calculate_speech_metrics


def main() -> None:
    result = TranscriptionResult(text="I am ready to lead this project.", duration=3.0, words=[])
    print(calculate_speech_metrics(result).model_dump_json())


if __name__ == "__main__":
    main()
