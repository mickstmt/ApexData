"""
Loading a session, saying so when there is nothing to load.

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

import logging

import fastf1
from fastapi import HTTPException

from app.utils.events import event_key

logger = logging.getLogger(__name__)


def load_session(year: int, event: str, session_type: str, **options):
    """Load a session, or raise a 404 if it has no data yet."""
    session = fastf1.get_session(year, event_key(event), session_type)

    try:
        session.load(**options)
    except Exception:
        logger.warning("La sesión %s %s %s no se pudo cargar", year, event, session_type)
        raise _sin_datos(year, event, session_type)

    # "Finished loading data for 0 drivers" is what an unraced session looks
    # like: everything failed quietly and the frames are empty.
    if len(session.drivers) == 0:
        raise _sin_datos(year, event, session_type)

    return session


def _sin_datos(year: int, event: str, session_type: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail=(
            f"La sesión {session_type} de {year} ronda {event} todavía no tiene datos. "
            "La cronometría aparece cuando la sesión se corre."
        ),
    )
