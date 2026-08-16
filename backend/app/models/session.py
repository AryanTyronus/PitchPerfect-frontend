from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.models.metrics import EvaluationResult, PauseInfo, SpeechMetrics, TranscriptionResult, WordTimestamp


class QuestionAnswerInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    question: str = Field(min_length=1, max_length=2000)
    transcript: str = Field(default="")
    duration_seconds: float = Field(default=0.0, ge=0)
    words: list[WordTimestamp] = Field(default_factory=list)


class SessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    title: str = Field(default="Interview practice", min_length=1, max_length=200)
    transcript: str | None = None
    questions: list[QuestionAnswerInput] | None = None


class QuestionAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    question: str
    transcript: str = ""
    metrics: SpeechMetrics | None = None
    evaluation: EvaluationResult | None = None
    # Numeric speech metrics surfaced alongside the LLM scores.
    wpm: float | None = None
    filler_word_count: int | None = None
    filler_breakdown: dict[str, int] = Field(default_factory=dict)
    pause_count: int = 0
    pauses: list[PauseInfo] = Field(default_factory=list)


class SessionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: UUID = Field(default_factory=uuid4)
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    transcription: TranscriptionResult | None = None
    metrics: SpeechMetrics | None = None
    evaluation: EvaluationResult | None = None
    questions: list[QuestionAnswer] = Field(default_factory=list)


class SessionOverview(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str
    title: str
    score: float | None = None
    created_at: datetime
    status: str = "completed"
