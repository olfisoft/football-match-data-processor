import os
import json
import base64
import boto3
from typing import Any, Dict

STATE_MACHINE_ARN = os.getenv("STATE_MACHINE_ARN")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Consumes a batch of Match events
    :param event: The event data
    :param context: The context data
    :return: The object with status code
    """
    print(f"Started consuming Match events: {event}")

    match_events = []
    for _, records in event['records'].items():
        for record in records:
            value = base64.b64decode(record['value']).decode('utf-8')
            match_events.append(value)
            
            extra = {
                "topic": record['topic'],
                "partition": record['partition'],
                "offset": record['offset'],
                "timestamp": record['timestamp'],
                "value": value}
            print(f"Received Match event: {extra}")

    lambda_event = {
        'match_events': match_events,
    }

    try:
        stepfunctions_client = boto3.client('stepfunctions')
        response = stepfunctions_client.start_execution(
            stateMachineArn=STATE_MACHINE_ARN,
            input=json.dumps(lambda_event)
        )
        print(f"Execution started, state machine ARN: {response['executionArn']}")
    except Exception as ex:
        print(f"Error starting Step Function execution: {str(ex)}")
        raise ex

    return {
        "statusCode": 200
    }
