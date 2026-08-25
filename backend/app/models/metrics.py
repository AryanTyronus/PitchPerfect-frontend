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


class SubScores(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    clarity: int = Field(default=0, ge=0, le=20)
    relevance: int = Field(default=0, ge=0, le=20)
    professionalism: int = Field(default=0, ge=0, le=20)
    structure: int = Field(default=0, ge=0, le=20)
    impact: int = Field(default=0, ge=0, le=20)

    def average(self) -> float:
        return (self.clarity + self.relevance + self.professionalism + self.structure + self.impact) / 5.0


class EvaluationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    score: int = Field(ge=0, le=100)
    disqualified: bool = False
    feedback: str = Field(default="", max_length=2000)
    sub_scores: SubScores
    eye_contact_percentage: float | None = Field(default=None, ge=0, le=100)
    source: str = "local"

    @model_validator(mode="after")
    def validate_calibration(self) -> "EvaluationResult":
        # Disqualified answers must never carry a meaningful score.
        if self.disqualified and self.score > 10:
            self.score = min(self.score, 10)
            for name in type(self.sub_scores).model_fields:
                if getattr(self.sub_scores, name) > 2:
                    setattr(self.sub_scores, name, 2)
        return self


def create_disqualified_evaluation(
    feedback: str = "no audible speech or response detected in recording.",
    score: int = 0,
    source: str = "validation",
) -> EvaluationResult:
    """Deterministic safe evaluation used for invalid transcripts and LLM failures."""
    return EvaluationResult(
        score=score,
        disqualified=True,
        feedback=feedback,
        sub_scores=SubScores(),
        source=source,
    )
