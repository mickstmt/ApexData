"""
Weather data endpoints
"""
from fastapi import APIRouter, HTTPException
import fastf1
from app.utils.cache_manager import cache_manager

router = APIRouter()


@router.get("/{year}/{event}/{session_type}")
async def get_session_weather(
    year: int,
    event: str,
    session_type: str,
):
    """
    Get weather data for a session

    Parameters:
    - year: Season year
    - event: Event name or round number
    - session_type: Session type

    Returns weather information including temperature, humidity, pressure, etc.
    """
    try:
        cache_key = f"weather_{year}_{event}_{session_type}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = fastf1.get_session(year, event, session_type)
        session.load()

        weather = session.weather_data

        if weather.empty:
            raise HTTPException(status_code=404, detail="No weather data available")

        result = {
            "session": {
                "year": year,
                "event": event,
                "type": session_type,
                "name": session.event['EventName']
            },
            "weather_data": weather.to_dict(orient='records')
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weather: {str(e)}")
