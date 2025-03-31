import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class MatchEvent(BaseModel):
    """
    Match Event model
    Object represantation of the Match event, validates input parameters
    """
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    event_type: str
    team: str
    player: str
    timestamp: str

    @field_validator("match_id")
    def all_chars_must_be_integers(cls, value):
        if not value.isdigit():
            raise ValueError("All characters in the Match id must be integers")
        return value

    @field_validator("timestamp")
    def validate_timestamp_format(cls, v):
        try:
            # Timestamp should have the required format
            datetime.strptime(v, "%Y-%m-%dT%H:%M:%S%z")
        except ValueError:
            raise ValueError("Timestamp must be in format '%Y-%m-%dT%H:%M:%S%z'")
        return v
