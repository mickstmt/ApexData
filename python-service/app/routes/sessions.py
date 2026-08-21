"""
Session and event information endpoints
"""
import logging

from fastapi import APIRouter, HTTPException
import fastf1
from app.utils.cache_manager import cache_manager
from app.utils.classification import build_classification
from app.utils.serialization import records, scalar
from app.utils.events import event_key

logger = logging.getLogger(__name__)

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
            "events": records(schedule)
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        logger.exception("Error fetching schedule")
        raise HTTPException(status_code=500, detail="Error fetching schedule")


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
        logger.exception("Error fetching event")
        raise HTTPException(status_code=500, detail="Error fetching event")


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

        session = fastf1.get_session(year, event_key(event), session_type)
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
            "results": records(results) if results is not None and not results.empty else []
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        logger.exception("Error fetching session info")
        raise HTTPException(status_code=500, detail="Error fetching session info")


@router.get("/{year}/{event}/{session_type}/classification")
async def get_qualifying_classification(year: int, event: str, session_type: str):
    """
    Provisional classification for a qualifying-style session (Q or SQ).

    This exists because the results source used by the site — Jolpica — never
    publishes practice or sprint-qualifying results, and publishes qualifying
    hours after the flag. FastF1 has the timing the moment the session runs, so
    the order can be rebuilt from the laps themselves.

    Rebuilding it is not "sort by best lap": a qualifying result is banded by
    segment. Someone knocked out in SQ1 stays behind everyone who reached SQ2
    even on the rare occasion their time was quicker. FastF1 splits the
    segments itself, so the split is not reimplemented here — drivers are
    ranked inside the last segment they took part in, best segments first.

    Drivers who set no time still appear, at the back and without a time,
    rather than silently vanishing from the grid.
    """
    try:
        cache_key = f"classification_{year}_{event}_{session_type}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = fastf1.get_session(year, event_key(event), session_type)
        session.load(telemetry=False, weather=False, messages=False)

        # Names and teams come from the results table, which FastF1 fills from
        # the entry list even when the finishing positions are still empty.
        details = {}
        results = getattr(session, "results", None)
        if results is not None and not results.empty:
            for _, row in results.iterrows():
                code = row.get("Abbreviation")
                if not code:
                    continue
                details[code] = {
                    "driverName": row.get("FullName") or code,
                    "team": row.get("TeamName") or None,
                    "number": scalar(row.get("DriverNumber")),
                }

        segments = session.laps.split_qualifying_sessions()
        classification = build_classification(segments, details)

        result = {
            "year": year,
            "event": event,
            "session": session.name,
            "session_type": session_type,
            "segments": sum(
                1 for segment in segments if segment is not None and not segment.empty
            ),
            # Said out loud so the page can say it too: this is rebuilt from
            # timing, and grid penalties are applied afterwards by the FIA.
            "provisional": True,
            "classification": classification,
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception:
        logger.exception("Error building classification")
        raise HTTPException(status_code=500, detail="Error building classification")
