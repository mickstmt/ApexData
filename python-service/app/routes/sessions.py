"""
Session and event information endpoints
"""
from fastapi import APIRouter, HTTPException
import fastf1
from app.utils.cache_manager import cache_manager

router = APIRouter()


@router.get("/{year}")
async def get_season_schedule(year: int):
    """
    Get the event schedule for a season

    Returns all events/races in the season with dates and locations
    """
    try:
        cache_key = f"schedule_{year}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        schedule = fastf1.get_event_schedule(year)

        result = {
            "year": year,
            "total_events": len(schedule),
            "events": schedule.to_dict(orient='records')
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching schedule: {str(e)}")


@router.get("/{year}/{event}")
async def get_event_info(year: int, event: str):
    """
    Get detailed information about a specific event

    Returns event details including all sessions
    """
    try:
        cache_key = f"event_{year}_{event}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        event_data = fastf1.get_event(year, event)

        result = {
            "year": year,
            "event": event_data.to_dict()
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching event: {str(e)}")


@router.get("/{year}/{event}/{session_type}/info")
async def get_session_info(year: int, event: str, session_type: str):
    """
    Get information about a specific session

    Returns session metadata and results
    """
    try:
        cache_key = f"session_info_{year}_{event}_{session_type}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = fastf1.get_session(year, event, session_type)
        session.load()

        # Get session results
        results = session.results if hasattr(session, 'results') else None

        result = {
            "session": {
                "name": session.name,
                "date": str(session.date),
                "event": session.event['EventName'],
                "location": session.event['Location'],
                "country": session.event['Country'],
            },
            "results": results.to_dict(orient='records') if results is not None and not results.empty else []
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session info: {str(e)}")
