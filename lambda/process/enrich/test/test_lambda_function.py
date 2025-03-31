import uuid
import json

import app

def test_enrichment():

    event_id1 = str(uuid.uuid4())
    event_id2 = str(uuid.uuid4())
    match_events = [
        {
            "event_id": event_id1,
            "match_id": "000001",
            "event_type": "goal",
            "team": "Team A",
            "player": "Player 1",
            "timestamp": "2024-02-15T13:30:00Z"
        },
        {
            "event_id": event_id2,
            "match_id": "000002",
            "event_type": "pass",
            "team": "Team A",
            "player": "Player 2",
            "timestamp": "2024-10-15T16:30:00Z"
        }
    ]

    match_events = [
        json.dumps(match_event) for match_event in match_events
    ]

    lambda_event = {
        'match_events': match_events,
    }
    result = app.handler(lambda_event, None)

    enriched_data = result['enriched_data']

    assert (enriched_data[event_id1]['season'] == "2023-2024" and
            enriched_data[event_id2]['season'] == "2024-2025")
