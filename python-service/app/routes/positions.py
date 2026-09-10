"""
Las posiciones de la carrera para el replay.

Dos rutas sobre un mismo cálculo, que se hace una vez y se guarda entero:

- `/{year}/{event}/{session_type}/meta` — el JSON pequeño: pilotos, línea de
  tiempo, cruces de vuelta, estados de pista y trazado de referencia.
- `/{year}/{event}/{session_type}` — el bloque binario de posiciones.

Van separadas porque tienen vidas distintas en el navegador: el meta se lee
como JSON de siempre y el bloque como `ArrayBuffer`. Pero salen del mismo
cálculo y de la misma entrada de caché, así que nunca describen carreras
distintas.
"""

import logging

from fastapi import APIRouter, HTTPException, Response

from app.utils.cache_manager import cache_manager
from app.utils.loading import load_session
from app.utils.positions import (
    PASO,
    SIN_DATO,
    cruces_de_vuelta,
    estados_relativos,
    linea_de_tiempo,
    remuestrear,
)
from app.utils.serialization import scalar
from app.utils.track import track_points

logger = logging.getLogger(__name__)

router = APIRouter()

# Solo lo que tiene veinte coches a la vez en pista durante una hora. La
# clasificación es una vuelta suelta y ya la cubren las trazas con el cursor.
SESIONES_CON_CARRERA = {"R", "S"}


def _rotacion(session) -> float:
    try:
        return float(session.get_circuit_info().rotation)
    except Exception:
        return 0.0


def _trazado(session) -> list[dict]:
    """El trazado de referencia, sobre el que el cliente proyecta cada coche
    para ordenar el leaderboard. Sale de la vuelta más rápida, como el mapa."""
    try:
        vuelta = session.laps.pick_fastest()
        if vuelta is None:
            return []
        return track_points(vuelta.get_telemetry())
    except Exception:
        logger.warning("Sin trazado de referencia para el replay")
        return []


def _piloto(session, numero: str, laps, inicio: float) -> dict:
    info = session.get_driver(numero)
    color = scalar(info.get("TeamColor")) if info is not None else None

    return {
        "number": numero,
        "code": scalar(info.get("Abbreviation")) if info is not None else numero,
        "name": scalar(info.get("FullName")) if info is not None else numero,
        "team": scalar(info.get("TeamName")) if info is not None else None,
        "color": f"#{color}" if color else None,
        "laps": cruces_de_vuelta(laps.pick_drivers(numero), inicio),
    }


async def _calcular(year: int, event: str, session_type: str) -> dict:
    if session_type not in SESIONES_CON_CARRERA:
        raise HTTPException(
            status_code=400,
            detail="El replay solo existe para carrera y sprint (R, S).",
        )

    clave = f"positions_v1_{year}_{event}_{session_type}"

    guardado = cache_manager.get(clave)
    if guardado is not None:
        return guardado

    session = await load_session(year, event, session_type)

    laps = session.laps
    if laps is None or laps.empty:
        raise HTTPException(status_code=404, detail="No lap data available for this session")

    # De la salida al último cruce de meta: fuera quedan la vuelta de
    # formación y la de honor, que alargan la sesión media hora y no cuentan
    # nada.
    inicio = float(laps["LapStartTime"].min().total_seconds())
    fin = float(laps["Time"].max().total_seconds())
    timeline = linea_de_tiempo(inicio, fin)

    orden = [str(numero) for numero in session.drivers]
    bloque = remuestrear(session.pos_data, orden, timeline)

    meta = {
        "session": {
            "year": year,
            "event": str(session.event["EventName"]) if session.event is not None else event,
            "type": session_type,
            "name": str(session.name),
        },
        "timeline": {"start": round(inicio, 3), "step": PASO, "count": int(len(timeline))},
        "sinDato": SIN_DATO,
        "totalLaps": int(laps["LapNumber"].max()),
        "rotation": _rotacion(session),
        "drivers": [_piloto(session, numero, laps, inicio) for numero in orden],
        "trackStatus": estados_relativos(getattr(session, "track_status", None), inicio, fin),
        "track": _trazado(session),
    }

    # `meta` va primero a propósito: la caché comprueba que lo que guarda sea
    # JSON sin NaN, y al llegar al bloque de bytes deja de mirar. Si el meta
    # trajera un NaN se vería aquí y no en el navegador.
    resultado = {"meta": meta, "blob": bloque}
    cache_manager.set(clave, resultado)

    return resultado


@router.get("/{year}/{event}/{session_type}/meta")
async def get_positions_meta(year: int, event: str, session_type: str):
    try:
        return (await _calcular(year, event, session_type))["meta"]
    except HTTPException:
        # El 404 de una sesión sin correr no es un fallo nuestro.
        raise
    except Exception:
        logger.exception("Error building positions meta")
        raise HTTPException(status_code=500, detail="Error building positions meta")


@router.get("/{year}/{event}/{session_type}")
async def get_positions(year: int, event: str, session_type: str):
    try:
        bloque = (await _calcular(year, event, session_type))["blob"]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error building positions")
        raise HTTPException(status_code=500, detail="Error building positions")

    return Response(content=bloque, media_type="application/octet-stream")
