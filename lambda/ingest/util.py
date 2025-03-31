import json
from typing import Any, Dict

def get_response(status_code: int,
                 message: str, params: Dict[str, Any]=None) -> Dict[str, Any]:
    """
    Generates a required response for the API
    :param status_code: Status code
    :param message: A message with details
    :param params: Additional parameters
    :param body: Response body
    :return: The response data
    """
    body = {
        "message": message,
    }

    if params is not None:
        body.update(params)

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }

def get_success_response(params: Dict[str, Any]=None) -> Dict[str, Any]:
    """
    Generates a successfull response for the API
    :param params: Additional parameters
    :return: The response data"
    """
    return get_response(200, "Match event ingested OK", params)
