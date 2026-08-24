"""
Loading a session without stopping the whole service, and saying so when there
is nothing to load.

A session that has not been run yet loads without raising: FastF1 fetches every
piece, fails at each one and finishes "for 0 drivers". The first line that then
touches `session.laps` raises `DataNotLoadedError`, the route's catch-all turns
it into a 500, and the page says something went wrong on our side.

Nothing went wrong. The session simply has not happened. That is a 404 —"there
is no such thing yet"— and it is what lets the page say the honest sentence
instead of an error. It matters more now that the weekend in progress shows up
in the telemetry picker: choosing Saturday's race on Friday is an ordinary
thing to do, not a mistake.
"""

import asyncio
import logging

import fastf1
from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool

from app.utils.cache_manager import cache_manager
from app.utils.events import event_key

logger = logging.getLogger(__name__)

# Solo una carga a la vez.
#
# `session.load()` descarga y parsea una sesión entera: medido, 36 segundos la
# primera vez. Declarar la ruta `async def` y llamarlo dentro no lo hace
# concurrente — lo ejecuta EN el bucle de eventos, así que una sola petición
# dejaba al servicio sin atender a nadie más mientras duraba: ni la
# comprobación de salud, ni las respuestas que ya estaban en caché.
#
# Sacarlo a un hilo libera el bucle. El semáforo lo mantiene en uno cada vez a
# propósito: FastF1 no promete ser seguro entre hilos y su caché es un SQLite
# compartido, así que dos cargas simultáneas es un riesgo que no compensa. Lo
# que se gana no es paralelismo, es que el servicio siga vivo: mientras una
# carga larga ocurre en su hilo, la salud responde y lo cacheado se sirve al
# instante.
_una_carga_a_la_vez = asyncio.Semaphore(1)

# Cuánto se recuerda que una sesión no tiene datos.
#
# Sin esto, cada petición a una sesión que no se ha corrido vuelve a intentar la
# descarga entera —3,5 segundos medidos— porque el camino de error no guardaba
# nada. Repetirla salía gratis a quien la pedía y cara a nosotros. Cinco minutos
# es poco para molestar el sábado por la mañana, cuando los datos están a punto
# de llegar, y bastante para que insistir no sirva de nada.
_SIN_DATOS_TTL = 300


def _clave_sin_datos(year: int, event: str, session_type: str) -> str:
    return f"sin_datos_{year}_{event}_{session_type}"


async def load_session(year: int, event: str, session_type: str, **options):
    """Load a session in a worker thread, or raise a 404 if it has no data yet."""
    clave = _clave_sin_datos(year, event, session_type)

    if cache_manager.get(clave) is not None:
        raise _sin_datos(year, event, session_type)

    async with _una_carga_a_la_vez:
        try:
            session = await run_in_threadpool(_cargar, year, event, session_type, **options)
        except _SinDatos:
            # Se recuerda el veredicto, no el error: la próxima petición igual
            # responde en milisegundos en vez de volver a intentarlo todo.
            cache_manager.set(clave, True, ttl=_SIN_DATOS_TTL)
            raise _sin_datos(year, event, session_type)

    return session


class _SinDatos(Exception):
    """Interna: cruza la frontera del hilo, donde HTTPException no debe viajar."""


def _cargar(year: int, event: str, session_type: str, **options):
    """La parte bloqueante, la única que corre fuera del bucle de eventos."""
    session = fastf1.get_session(year, event_key(event), session_type)

    try:
        session.load(**options)
    except Exception:
        logger.warning("La sesión %s %s %s no se pudo cargar", year, event, session_type)
        raise _SinDatos

    # "Finished loading data for 0 drivers" is what an unraced session looks
    # like: everything failed quietly and the frames are empty.
    if len(session.drivers) == 0:
        raise _SinDatos

    return session


def _sin_datos(year: int, event: str, session_type: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail=(
            f"La sesión {session_type} de {year} ronda {event} todavía no tiene datos. "
            "La cronometría aparece cuando la sesión se corre."
        ),
    )
