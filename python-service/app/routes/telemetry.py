"""
Telemetry endpoints - Speed, RPM, Throttle, Brake, etc.
"""
import logging

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import fastf1
import pandas as pd
from app.utils.cache_manager import cache_manager
from app.utils.serialization import records, format_lap_time
from app.utils.track import track_points
from app.utils.events import event_key
from app.utils.loading import load_session

logger = logging.getLogger(__name__)

router = APIRouter()


def _rotacion_del_circuito(session, year: int, event: str) -> float:
    """Los grados que hay que girar el trazado para verlo como en televisión.

    Sin rotación el circuito sale tumbado respecto a como todo el mundo lo ha
    visto siempre, y cuesta reconocerlo. Si FastF1 no la tiene, cero: un mapa
    girado raro es mejor que ningún mapa.
    """
    try:
        return float(session.get_circuit_info().rotation)
    except Exception:
        logger.warning("Circuit rotation unavailable for %s %s", year, event)
        return 0.0


# NOTE: this literal route must stay declared BEFORE /{year}/{event}/{session_type}/{driver},
# otherwise Starlette matches "compare" as a driver code and the comparison never runs.
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
        cache_key = f"compare_{year}_{event}_{session_type}_{driver1}_{driver2}_{lap1}_{lap2}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = await load_session(year, event, session_type)

        laps_d1 = session.laps.pick_drivers(driver1)
        laps_d2 = session.laps.pick_drivers(driver2)

        if laps_d1.empty or laps_d2.empty:
            raise HTTPException(status_code=404, detail="Laps not found for one or both drivers")

        if lap1:
            target_d1 = laps_d1[laps_d1['LapNumber'] == lap1]
            if target_d1.empty:
                raise HTTPException(status_code=404, detail=f"Lap {lap1} not found for driver {driver1}")
            lap_d1 = target_d1.iloc[0]
        else:
            # pick_fastest() already returns a single Lap (or None); indexing it
            # with .iloc[0] would yield that lap's first column instead.
            lap_d1 = laps_d1.pick_fastest()
            if lap_d1 is None:
                raise HTTPException(status_code=404, detail=f"No timed lap found for driver {driver1}")

        if lap2:
            target_d2 = laps_d2[laps_d2['LapNumber'] == lap2]
            if target_d2.empty:
                raise HTTPException(status_code=404, detail=f"Lap {lap2} not found for driver {driver2}")
            lap_d2 = target_d2.iloc[0]
        else:
            lap_d2 = laps_d2.pick_fastest()
            if lap_d2 is None:
                raise HTTPException(status_code=404, detail=f"No timed lap found for driver {driver2}")

        tel_d1 = lap_d1.get_telemetry()
        tel_d2 = lap_d2.get_telemetry()

        result = {
            "driver1": {
                "code": driver1,
                "lap_number": int(lap_d1['LapNumber']),
                "lap_time": format_lap_time(lap_d1['LapTime']),
                "compound": str(lap_d1['Compound']) if pd.notna(lap_d1['Compound']) else None,
                "telemetry": records(tel_d1)
            },
            "driver2": {
                "code": driver2,
                "lap_number": int(lap_d2['LapNumber']),
                "lap_time": format_lap_time(lap_d2['LapTime']),
                "compound": str(lap_d2['Compound']) if pd.notna(lap_d2['Compound']) else None,
                "telemetry": records(tel_d2)
            },
            "delta_time": format_lap_time(lap_d1['LapTime'] - lap_d2['LapTime']),
            # Los grados que hay que girar el trazado para verlo como en
            # televisión. El mapa de velocidad ya los servía; la comparación no,
            # y sin ellos el mapa de minisectores sale tumbado y cuesta
            # reconocer el circuito.
            "rotation": _rotacion_del_circuito(session, year, event),
        }

        cache_manager.set(cache_key, result)

        return result

    except HTTPException:
        raise
    except HTTPException:
        # El 404 de una sesión sin correr no es un fallo nuestro.
        raise
    except Exception as e:
        logger.exception("Error comparing telemetry")
        raise HTTPException(status_code=500, detail="Error comparing telemetry")


@router.get("/{year}/{event}/{session_type}/{driver}/track")
async def get_driver_track(
    year: int,
    event: str,
    session_type: str,
    driver: str,
    lap: Optional[int] = Query(None, description="Specific lap number. If not provided, uses fastest lap"),
):
    """
    Trazado del circuito recorrido por un piloto, con la velocidad en cada punto.

    Es el mapa de velocidad que faltaba del Sprint 4. Devuelve las coordenadas
    tal y como las graba FastF1, sin girar ni escalar: la rotación del circuito
    viaja aparte para que la dibuje quien conoce el tamaño del lienzo.
    """
    try:
        cache_key = f"track_{year}_{event}_{session_type}_{driver}_{lap}"

        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        session = await load_session(year, event, session_type)

        driver_laps = session.laps.pick_drivers(driver)
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"No laps found for driver {driver}")

        if lap is not None:
            target_lap = driver_laps[driver_laps["LapNumber"] == lap]
            if target_lap.empty:
                raise HTTPException(status_code=404, detail=f"Lap {lap} not found for driver {driver}")
            lap_data = target_lap.iloc[0]
        else:
            lap_data = driver_laps.pick_fastest()
            if lap_data is None:
                raise HTTPException(status_code=404, detail=f"No timed lap found for driver {driver}")

        telemetry = lap_data.get_telemetry()
        points = track_points(telemetry)

        if not points:
            # Las sesiones anteriores a 2018 no traen posición: es un "no hay",
            # no un fallo del servicio.
            raise HTTPException(status_code=404, detail="No position data available for this lap")

        speeds = [p["speed"] for p in points]

        # La rotación es opcional: si FastF1 no la trae, el mapa se dibuja sin
        # girar en vez de no dibujarse.
        rotation = _rotacion_del_circuito(session, year, event)

        result = {
            "driver": driver,
            "lap_number": int(lap_data["LapNumber"]),
            "lap_time": format_lap_time(lap_data["LapTime"]),
            "rotation": rotation,
            "min_speed": min(speeds),
            "max_speed": max(speeds),
            "points": points,
        }

        cache_manager.set(cache_key, result)
        return result

    except HTTPException:
        raise
    except HTTPException:
        # El 404 de una sesión sin correr no es un fallo nuestro.
        raise
    except Exception:
        logger.exception("Error fetching track map")
        raise HTTPException(status_code=500, detail="Error fetching track map")


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
        session = await load_session(year, event, session_type)

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
            # pick_fastest() already returns a single Lap (or None); indexing it
            # with .iloc[0] would yield that lap's first column instead.
            lap_data = driver_laps.pick_fastest()
            if lap_data is None:
                raise HTTPException(status_code=404, detail=f"No timed lap found for driver {driver}")

        # Get telemetry
        telemetry = lap_data.get_telemetry()

        if telemetry.empty:
            raise HTTPException(status_code=404, detail="No telemetry data available for this lap")

        # Convert to dict
        result = {
            "driver": driver,
            "lap_number": int(lap_data['LapNumber']),
            "lap_time": format_lap_time(lap_data['LapTime']),
            "is_personal_best": bool(lap_data['IsPersonalBest']),
            "compound": str(lap_data['Compound']) if pd.notna(lap_data['Compound']) else None,
            "tyre_life": int(lap_data['TyreLife']) if pd.notna(lap_data['TyreLife']) else None,
            "telemetry": records(telemetry)
        }

        # Cache result
        cache_manager.set(cache_key, result)

        return result

    except HTTPException:
        raise
    except HTTPException:
        # El 404 de una sesión sin correr no es un fallo nuestro.
        raise
    except Exception as e:
        logger.exception("Error fetching telemetry")
        raise HTTPException(status_code=500, detail="Error fetching telemetry")
