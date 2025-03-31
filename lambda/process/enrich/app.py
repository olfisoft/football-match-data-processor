
from typing import Any, Dict
from datetime import datetime
from european_league import get_european_league_season
import json

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Enriches a batch of Match events
    :param event: The event data
    :param context: The context data
    :return: The object with Match events and enriched data
    """

    print(f"Started batch enrichment of Match events: {event}")
    match_events = [
        json.loads(item) for item in event['match_events']
    ]

    # Enrich a batch of Match events
    try:
        enriched_data = {}
        for match_event in match_events:
            event_id = match_event['event_id']
            date_object = datetime.strptime(
                match_event['timestamp'],
                "%Y-%m-%dT%H:%M:%S%z"
            )

            enriched_event = {
                "season": get_european_league_season(date_object)
            }
            enriched_data[event_id] = enriched_event

            print(f"Enriched Match event: {enriched_event}")
    except Exception as ex:
        print(f"Error enriching Match events: {str(ex)}")
        raise ex

    return {
        "match_events": match_events,
        "enriched_data": enriched_data
    }
