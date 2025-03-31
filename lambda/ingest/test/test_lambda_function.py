import json

import app

def test_request_success():
    """
    Tests the response when the request has valid format
    """

    body = {
        "match_id": "000001",
        "event_type": "goal",
        "team": "Team A",
        "player": "Player 1",
        "timestamp": "2024-02-15T13:30:00Z"
    }
    event = {
        "resource": "/matches/event",
        "path": "/matches/event",
        "httpMethod": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer token123"
        },
        "queryStringParameters": {},
        "pathParameters": {},
        "body": json.dumps(body),
        "isBase64Encoded": False
    }

    result = app.handler(event, None)

    assert result["statusCode"] == 200

def test_request_timestamp_fail():
    """
    Tests the response when the timestamp has invalid format
    """

    body = {
        "match_id": "000001",
        "event_type": "goal",
        "team": "Team A",
        "player": "Player 1",
        "timestamp": "02-2024-15T13:30:00Z" # Invalid timestamp
    }
    event = {
        "resource": "/matches/event",
        "path": "/matches/event",
        "httpMethod": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer token123"
        },
        "queryStringParameters": {},
        "pathParameters": {},
        "body": json.dumps(body),
        "isBase64Encoded": False
    }

    result = app.handler(event, None)

    assert result["statusCode"] == 400

def test_request_match_id_fail():
    """
    Tests the response when the match_id has invalid characters
    """

    body = {
        "match_id": "a00001", # Invalid Match id character
        "event_type": "goal",
        "team": "Team A",
        "player": "Player 1",
        "timestamp": "2024-02-15T13:30:00Z"
    }
    event = {
        "resource": "/matches/event",
        "path": "/matches/event",
        "httpMethod": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer token123"
        },
        "queryStringParameters": {},
        "pathParameters": {},
        "body": json.dumps(body),
        "isBase64Encoded": False
    }

    result = app.handler(event, None)

    assert result["statusCode"] == 400

