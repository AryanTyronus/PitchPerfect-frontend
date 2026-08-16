from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    session_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


class FeedbackRecord(FeedbackCreate):
    id: UUID
