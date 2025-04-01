import uuid
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator

class EventType(str, Enum):
    GOAL = "goal"
    PASS = "pass"
    FOUL = "foul"

class MatchEvent(BaseModel):
    """
    Match Event model
    Object represantation of the Match event, validates input parameters
    """
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    event_type: EventType
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

    @field_validator("event_type")
    def validate_event_type(cls, value):
        # Event type should be supported
        if value not in EventType:
            raise ValueError(f"Invalid event_type: {value}. Must be one of {list(EventType)}")
        return value
    