import os
import json
import boto3
from typing import Any, Dict

table_name = os.getenv('DYNAMODB_TABLE_NAME')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handles query requests for Match data
    :param event: The event data
    :param context: The context data
    :return: The response data
    """

    print(f"Received Get request: {event}")
    path = event['path']
    path_items = path.split('/')
    match_id = path_items[2]
    event_type = path_items[3]

    if event_type == 'goals':
        event_type = 'goal'
    elif event_type == 'passes':
        event_type = 'pass'

    print(f"Received match_id: {match_id}, event_type: {event_type}")
    if not event_type:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "message": "Invalid event_type"
            })
        }

    # Run DynamoDB query to get a count of event_type items
    count: int = 0
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)

        response = table.query(
            IndexName='MatchIdEventTypeIndex',
            Select='COUNT',
            KeyConditionExpression='match_id = :match_id AND event_type = :event_type',
            ExpressionAttributeValues={
                ':match_id': match_id,
                ':event_type': event_type
            }
        )
        print(f"Data response: {response}")
        count = response['Count']
    except Exception as ex:
        print(f"DynamoDB error: {ex}")
        raise ex # Internal server error

    return {
        "statusCode": 200,
        "body": json.dumps({
            "match_id": match_id,
            "event_type": event_type,
            "count": count
        })
    }
