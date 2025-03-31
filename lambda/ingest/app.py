import os
import json
from typing import Any, Dict
from pydantic import ValidationError

from data_model import MatchEvent
from util import get_response, get_success_response

TEST_ENV = os.getenv('FMDP_TEST_ENV')
MSK_TOPIC_NAME = os.getenv('MSK_TOPIC_NAME')
MSK_CLUSTER_ARN = os.getenv('MSK_CLUSTER_ARN')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Ingests incoming events
    :param event: The event data
    :param context: The context data
    :return: The response data
    """
    print(f"Started ingesting Match event: {event}")

    # Validate Match event
    try:
        body = json.loads(event['body'])
        match_event = MatchEvent(**body)
    except ValidationError as ex:
        description = None
        errors = ex.errors()
        if errors:
            description = errors[0]['msg']
            
        print(f"Input validation error: {ex}")
        return get_response(400,
                            "Invalid input data",
                            { "description": description })
    
    if TEST_ENV:
        print(f"Test environment enabled")
        return get_success_response({
            "event_id": match_event.event_id})
    
    # Send Kafka message
    try:
        from kafka_producer import KafkaProducerContext
        from kafka.errors import KafkaError

        with KafkaProducerContext(MSK_CLUSTER_ARN) as producer:
            match_event_dict = match_event.model_dump()

            record_metadata = producer.send(MSK_TOPIC_NAME,
                                            json.dumps(match_event_dict))
    except KafkaError as ex:
        print(f"Kafka producer error: {ex}")
        raise ex # Internal server error
    else:
        extra = {
            "topic": record_metadata.topic,
            "partition": record_metadata.partition,
            "offset": record_metadata.offset
        }
        print(f"Sent Kafka message: {extra}")

    return get_success_response({
        "event_id": match_event.event_id})
