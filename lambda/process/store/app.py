import os
import json
import boto3
from typing import Any, Dict
from datetime import datetime, timezone

S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
DYNAMODB_TABLE_NAME = os.getenv('DYNAMODB_TABLE_NAME')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Stores a batch of Match data
    :param event: The event data
    :param context: The context data
    :return: The object with status code
    """

    print(f"Started storing a batch of Match data: {event}")

    extra = {
        "s3_bucket": S3_BUCKET_NAME,
        "dynamodb_table": DYNAMODB_TABLE_NAME
    }
    print(f"Received Storage config: {extra}")

    match_events = event['match_events']
    enriched_data = event['enriched_data']
    
    # Write enriched Match data to DynamoDB
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)

        with table.batch_writer() as batch:
            for match_event in match_events:
                event_id = match_event['event_id']
                item = match_event | enriched_data.get(event_id, {})
                batch.put_item(Item=item)
    except Exception as ex:
        print(f"Error writing Match data to DynamoDB: {str(ex)}")
        raise ex
    
    # Write a batch of raw Match events to S3 bucket
    try:
        first_event_id = match_events[0]['event_id']
        file_name = f"match_events_{first_event_id}.json"
        s3 = boto3.client('s3')
        s3.put_object(Bucket=S3_BUCKET_NAME,
                      Key=file_name,
                      Body=json.dumps(match_events).encode('utf-8'))
    except Exception as ex:
        print(f"Error writing Match events to S3 bucket: {str(ex)}")
        raise ex

    return {
        "statusCode": 200
    }
