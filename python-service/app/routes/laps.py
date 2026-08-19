"""
Lap times and lap data endpoints
"""
import logging

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import fastf1
import pandas as pd
from app.utils.cache_manager import cache_manager
from app.utils.serialization import records
from app.utils.track import group_by_driver, stints_from_laps
from app.utils.events import event_key

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{year}/{event}/{session_type}")
async def get_session_laps(
    year: int,
    event: str,
    session_type: str,
    driver: Optional[str] = Query(None, description="Filter by driver code"),
):
    """
    Get all lap times for a session

    Parameters:
    - year: Season year
    - event: Event name or round number
    - session_type: Session type ('FP1', 'FP2', 'FP3', 'Q', 'S', 'R')
    - driver: Optional driver filter

    Returns lap data including times, compounds, sectors, etc.
    """
    try:
        cache_key = f"laps_{year}_{event}_{session_type}_{driver}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = fastf1.get_session(year, event_key(event), session_type)
        session.load()

        laps = session.laps

        # Filter by driver if specified (use pick_drivers instead of deprecated pick_driver)
        if driver:
            laps = laps.pick_drivers(driver)

        if laps.empty:
            raise HTTPException(status_code=404, detail="No laps found")

        # Select relevant columns
        columns = [
            'Time', 'Driver', 'DriverNumber', 'LapTime', 'LapNumber',
            'Stint', 'PitOutTime', 'PitInTime', 'Sector1Time', 'Sector2Time',
            'Sector3Time', 'Sector1SessionTime', 'Sector2SessionTime',
            'Sector3SessionTime', 'SpeedI1', 'SpeedI2', 'SpeedFL', 'SpeedST',
            'IsPersonalBest', 'Compound', 'TyreLife', 'FreshTyre',
            'Team', 'TrackStatus', 'IsAccurate'
        ]

        # Filter columns that exist
        available_columns = [col for col in columns if col in laps.columns]
        laps_filtered = laps[available_columns]

        # Convert to dict
        result = {
            "session": {
                "year": year,
                "event": event,
                "type": session_type,
                "name": session.event['EventName'],
                "date": str(session.date)
            },
            "total_laps": len(laps_filtered),
            "laps": records(laps_filtered)
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        logger.exception("Error fetching laps")
        raise HTTPException(status_code=500, detail="Error fetching laps")


@router.get("/{year}/{event}/{session_type}/stints")
async def get_session_stints(
    year: int,
    event: str,
    session_type: str,
):
    """
    Estrategia de neumáticos: los tramos de cada piloto, con su compuesto.

    El otro pendiente del Sprint 4. Se devuelve agrupado por piloto y en el
    orden en que terminaron, porque una estrategia se lee comparando al ganador
    con los de atrás, no por orden alfabético.
    """
    try:
        cache_key = f"stints_{year}_{event}_{session_type}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = fastf1.get_session(year, event_key(event), session_type)
        session.load()

        if session.laps.empty:
            raise HTTPException(status_code=404, detail="No lap data available for this session")

        order: list[str] = []
        try:
            results = session.results
            if results is not None and not results.empty:
                order = [str(code) for code in results["Abbreviation"].tolist()]
        except Exception:
            # Sin resultados —una sesión de libres— el orden alfabético vale.
            logger.warning("Results unavailable for %s %s %s", year, event, session_type)

        drivers = group_by_driver(stints_from_laps(session.laps), order)

        if not drivers:
            raise HTTPException(status_code=404, detail="No stint data available for this session")

        result = {
            "session": {
                "year": year,
                "event": session.event["EventName"] if session.event is not None else event,
                "name": session_type,
            },
            "total_laps": int(session.laps["LapNumber"].max()),
            "drivers": drivers,
        }

        cache_manager.set(cache_key, result)
        return result

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching stints")
        raise HTTPException(status_code=500, detail="Error fetching stints")


@router.get("/{year}/{event}/{session_type}/fastest")
async def get_fastest_laps(
    year: int,
    event: str,
    session_type: str,
    limit: int = Query(10, description="Number of fastest laps to return"),
):
    """
    Get the fastest laps from a session

    Returns the top N fastest laps with driver info and lap details
    """
    try:
        cache_key = f"fastest_laps_{year}_{event}_{session_type}_{limit}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = fastf1.get_session(year, event_key(event), session_type)
        session.load()

        laps = session.laps

        # Filter out invalid laps
        laps = laps[laps['LapTime'].notna()]

        # Sort by lap time and get top N
        fastest = laps.sort_values('LapTime').head(limit)

        result = {
            "session": {
                "year": year,
                "event": event,
                "type": session_type,
                "name": session.event['EventName']
            },
            "fastest_laps": records(fastest[[
                'Driver', 'DriverNumber', 'Team', 'LapTime', 'LapNumber',
                'Compound', 'TyreLife', 'Sector1Time', 'Sector2Time', 'Sector3Time',
                'SpeedI1', 'SpeedI2', 'SpeedFL', 'SpeedST'
            ]])
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        logger.exception("Error fetching fastest laps")
        raise HTTPException(status_code=500, detail="Error fetching fastest laps")


@router.get("/{year}/{event}/{session_type}/driver/{driver}/analysis")
async def get_driver_lap_analysis(
    year: int,
    event: str,
    session_type: str,
    driver: str,
):
    """
    Get detailed lap analysis for a specific driver

    Returns statistics and insights about the driver's performance
    """
    try:
        cache_key = f"lap_analysis_{year}_{event}_{session_type}_{driver}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = fastf1.get_session(year, event_key(event), session_type)
        session.load()

        driver_laps = session.laps.pick_drivers(driver)

        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"No laps found for driver {driver}")

        # Calculate statistics
        valid_laps = driver_laps[driver_laps['LapTime'].notna()]

        fastest_lap = valid_laps.loc[valid_laps['LapTime'].idxmin()]

        result = {
            "driver": driver,
            "team": str(driver_laps.iloc[0]['Team']),
            "total_laps": len(driver_laps),
            "valid_laps": len(valid_laps),
            "fastest_lap": {
                "lap_number": int(fastest_lap['LapNumber']),
                "time": str(fastest_lap['LapTime']),
                "compound": str(fastest_lap['Compound']) if pd.notna(fastest_lap['Compound']) else None,
                "tyre_life": int(fastest_lap['TyreLife']) if pd.notna(fastest_lap['TyreLife']) else None
            },
            "average_lap_time": str(valid_laps['LapTime'].mean()) if not valid_laps.empty else None,
            "consistency": {
                "std_deviation": str(valid_laps['LapTime'].std()) if len(valid_laps) > 1 else None,
            },
            "sectors": {
                "sector1_best": str(valid_laps['Sector1Time'].min()) if not valid_laps['Sector1Time'].isna().all() else None,
                "sector2_best": str(valid_laps['Sector2Time'].min()) if not valid_laps['Sector2Time'].isna().all() else None,
                "sector3_best": str(valid_laps['Sector3Time'].min()) if not valid_laps['Sector3Time'].isna().all() else None,
            },
            "top_speeds": {
                "speed_i1": float(valid_laps['SpeedI1'].max()) if not valid_laps['SpeedI1'].isna().all() else None,
                "speed_i2": float(valid_laps['SpeedI2'].max()) if not valid_laps['SpeedI2'].isna().all() else None,
                "speed_fl": float(valid_laps['SpeedFL'].max()) if not valid_laps['SpeedFL'].isna().all() else None,
                "speed_st": float(valid_laps['SpeedST'].max()) if not valid_laps['SpeedST'].isna().all() else None,
            },
            "tyre_stints": driver_laps.groupby('Stint').agg({
                'Compound': 'first',
                'TyreLife': 'max',
                'LapNumber': ['min', 'max', 'count']
            }).to_dict()
        }

        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        logger.exception("Error analyzing driver laps")
        raise HTTPException(status_code=500, detail="Error analyzing driver laps")
