
from datetime import datetime

# European league seasons typically start in July or August
START_LEAGE_SEASON_MONTH = 7

def get_european_league_season(timestamp: datetime.timestamp) -> str:
    """
    Calculates the European league season for a given timestamp
    :param timestamp: event timestamp

    :return str: The season in the format "YYYY-YYYY"
    """

    year = timestamp.year
    month = timestamp.month

    if month >= START_LEAGE_SEASON_MONTH: 
        season_start = year
        season_end = year + 1
    else:
        season_start = year - 1
        season_end = year

    return f"{season_start}-{season_end}"
