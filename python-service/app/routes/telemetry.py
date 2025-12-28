"""
Telemetry endpoints - Speed, RPM, Throttle, Brake, etc.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import fastf1
import pandas as pd
from app.utils.cache_manager import cache_manager
from app.services.f1_service import F1Service

router = APIRouter()
f1_service = F1Service()


@router.get("/{year}/{event}/{session_type}/{driver}")
async def get_driver_telemetry(
    year: int,
    event: str,
    session_type: str,
    driver: str,
    lap: Optional[int] = Query(None, description="Specific lap number. If not provided, returns fastest lap"),
):
    """
    Get telemetry data for a specific driver in a session

    Parameters:
    - year: Season year (e.g., 2024)
    - event: Event name or round number (e.g., 'Monaco' or '6')
    - session_type: Type of session ('FP1', 'FP2', 'FP3', 'Q', 'S', 'R')
    - driver: Driver code (e.g., 'VER', 'HAM')
    - lap: Optional lap number. If omitted, returns fastest lap

    Returns telemetry data including:
    - Time, Speed, RPM, nGear, Throttle, Brake, DRS
    - Distance, X, Y, Z coordinates
    """
    try:
        cache_key = f"telemetry_{year}_{event}_{session_type}_{driver}_{lap}"

        # Check cache
        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        # Load session
        session = fastf1.get_session(year, event, session_type)
        session.load()

        # Get driver laps (use pick_drivers instead of deprecated pick_driver)
        driver_laps = session.laps.pick_drivers(driver)

        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"No laps found for driver {driver}")

        # Get specific lap or fastest lap
        if lap is not None:
            target_lap = driver_laps[driver_laps['LapNumber'] == lap]
            if target_lap.empty:
                raise HTTPException(status_code=404, detail=f"Lap {lap} not found for driver {driver}")
            lap_data = target_lap.iloc[0]
        else:
            fastest = driver_laps.pick_fastest()
            lap_data = fastest.iloc[0] if hasattr(fastest, 'iloc') and len(fastest) > 0 else fastest

        # Get telemetry
        telemetry = lap_data.get_telemetry()

        if telemetry.empty:
            raise HTTPException(status_code=404, detail="No telemetry data available for this lap")

        # Convert to dict
        result = {
            "driver": driver,
            "lap_number": int(lap_data['LapNumber']),
            "lap_time": str(lap_data['LapTime']),
            "is_personal_best": bool(lap_data['IsPersonalBest']),
            "compound": str(lap_data['Compound']) if pd.notna(lap_data['Compound']) else None,
            "tyre_life": int(lap_data['TyreLife']) if pd.notna(lap_data['TyreLife']) else None,
            "telemetry": telemetry.to_dict(orient='records')
        }

        # Cache result
        cache_manager.set(cache_key, result)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching telemetry: {str(e)}")


@router.get("/{year}/{event}/{session_type}/compare")
async def compare_drivers_telemetry(
    year: int,
    event: str,
    session_type: str,
    driver1: str = Query(..., description="First driver code"),
    driver2: str = Query(..., description="Second driver code"),
    lap1: Optional[int] = Query(None, description="Lap for driver1 (fastest if omitted)"),
    lap2: Optional[int] = Query(None, description="Lap for driver2 (fastest if omitted)"),
):
    """
    Compare telemetry data between two drivers

    Returns synchronized telemetry data for both drivers to allow direct comparison
    """
    try:
        print(f"[DEBUG] Comparing telemetry: year={year}, event={event}, session={session_type}, driver1={driver1}, driver2={driver2}")

        cache_key = f"compare_{year}_{event}_{session_type}_{driver1}_{driver2}_{lap1}_{lap2}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            print(f"[DEBUG] Returning cached data")
            return cached_data

        print(f"[DEBUG] Loading session...")
        session = fastf1.get_session(year, event, session_type)
        session.load()
        print(f"[DEBUG] Session loaded successfully")

        # Get laps for both drivers (use pick_drivers instead of deprecated pick_driver)
        print(f"[DEBUG] Getting laps for {driver1}...")
        laps_d1 = session.laps.pick_drivers(driver1)
        print(f"[DEBUG] Driver {driver1} laps count: {len(laps_d1)}")

        print(f"[DEBUG] Getting laps for {driver2}...")
        laps_d2 = session.laps.pick_drivers(driver2)
        print(f"[DEBUG] Driver {driver2} laps count: {len(laps_d2)}")

        if laps_d1.empty or laps_d2.empty:
            raise HTTPException(status_code=404, detail="Laps not found for one or both drivers")

        # Select specific laps or fastest
        print(f"[DEBUG] Selecting laps (lap1={lap1}, lap2={lap2})...")
        if lap1:
            lap_d1 = laps_d1[laps_d1['LapNumber'] == lap1].iloc[0]
        else:
            print(f"[DEBUG] Getting fastest lap for {driver1}...")
            fastest_d1 = laps_d1.pick_fastest()
            print(f"[DEBUG] Fastest lap type: {type(fastest_d1)}, has iloc: {hasattr(fastest_d1, 'iloc')}")
            lap_d1 = fastest_d1.iloc[0] if hasattr(fastest_d1, 'iloc') and len(fastest_d1) > 0 else fastest_d1

        if lap2:
            lap_d2 = laps_d2[laps_d2['LapNumber'] == lap2].iloc[0]
        else:
            print(f"[DEBUG] Getting fastest lap for {driver2}...")
            fastest_d2 = laps_d2.pick_fastest()
            print(f"[DEBUG] Fastest lap type: {type(fastest_d2)}, has iloc: {hasattr(fastest_d2, 'iloc')}")
            lap_d2 = fastest_d2.iloc[0] if hasattr(fastest_d2, 'iloc') and len(fastest_d2) > 0 else fastest_d2

        print(f"[DEBUG] Lap selected for {driver1}: {lap_d1['LapNumber']}")
        print(f"[DEBUG] Lap selected for {driver2}: {lap_d2['LapNumber']}")

        # Get telemetry
        print(f"[DEBUG] Getting telemetry for {driver1}...")
        tel_d1 = lap_d1.get_telemetry()
        print(f"[DEBUG] Telemetry {driver1} points: {len(tel_d1)}")

        print(f"[DEBUG] Getting telemetry for {driver2}...")
        tel_d2 = lap_d2.get_telemetry()
        print(f"[DEBUG] Telemetry {driver2} points: {len(tel_d2)}")

        result = {
            "driver1": {
                "code": driver1,
                "lap_number": int(lap_d1['LapNumber']),
                "lap_time": str(lap_d1['LapTime']),
                "compound": str(lap_d1['Compound']) if pd.notna(lap_d1['Compound']) else None,
                "telemetry": tel_d1.to_dict(orient='records')
            },
            "driver2": {
                "code": driver2,
                "lap_number": int(lap_d2['LapNumber']),
                "lap_time": str(lap_d2['LapTime']),
                "compound": str(lap_d2['Compound']) if pd.notna(lap_d2['Compound']) else None,
                "telemetry": tel_d2.to_dict(orient='records')
            },
            "delta_time": str(lap_d1['LapTime'] - lap_d2['LapTime'])
        }

        cache_manager.set(cache_key, result)

        return result

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error comparing telemetry: {str(e)}")
