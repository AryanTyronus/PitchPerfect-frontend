from typing import List

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WordTimestamp(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    word: str
    start: float = Field(ge=0)
    end: float = Field(ge=0)

    @model_validator(mode="after")
    def validate_order(self) -> "WordTimestamp":
        if self.end < self.start:
            raise ValueError("word end must be greater than or equal to start")
        return self

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)


class PauseInfo(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    duration: float = Field(ge=0)
    start: float = Field(ge=0)
    end: float = Field(ge=0)


class TranscriptionResult(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    text: str
    duration: float = Field(ge=0)
    words: List[WordTimestamp]
    eye_contact_percentage: float | None = Field(default=None, ge=0, le=100)


class SpeechMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    duration_seconds: float = Field(ge=0)
    word_count: int = Field(ge=0)
    words_per_minute: float = Field(ge=0)
    filler_word_count: int = Field(ge=0)
    filler_ratio: float = Field(ge=0, le=1)
    pause_count: int = Field(ge=0)
    total_pause_seconds: float = Field(ge=0)
    average_pause_seconds: float = Field(ge=0)
    energy_rms: float = Field(ge=0)
    energy_peak: float = Field(ge=0)


class MetricScore(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    score: float = Field(ge=0, le=100)
    rationale: str = Field(min_length=1, max_length=2000)


class EvaluationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    overall_score: float = Field(ge=0, le=100)
    clarity: MetricScore
    confidence: MetricScore
    structure: MetricScore
    strengths: List[str] = Field(default_factory=list, max_length=10)
    improvements: List[str] = Field(default_factory=list, max_length=10)
    source: str = "local"
