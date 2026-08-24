"""
JSON-safe conversion for FastF1 data frames.

Telemetry legitimately contains NaN — DistanceToDriverAhead has no value while
a driver leads, and channels are NaN before their first sample. Python's json
encoder emits a bare `nan` for those, which is not valid JSON, so FastAPI
raises and the whole response turns into a 500.

pandas' own writer maps NaN to null and timestamps to ISO strings, so records
are round-tripped through it rather than hand-cleaned.
"""

import json

import pandas as pd


def format_lap_time(value) -> str | None:
    """Timedelta -> "M:SS.mmm", the way lap and sector times are read.

    Negative durations are formatted with a leading sign, not by feeding the
    negative number to divmod. That is what used to happen, and it produced
    nonsense: the gap between two qualifying laps 0.455s apart came out as
    "-1:59.545", because `divmod(-0.455, 60)` is `(-1.0, 59.545)`. Lap times are
    always positive, so it went unnoticed until a comparison subtracted two.
    """
    if value is None or pd.isna(value):
        return None

    total = value.total_seconds()
    signo = "-" if total < 0 else ""
    minutes, seconds = divmod(abs(total), 60)

    if minutes:
        return f"{signo}{int(minutes)}:{seconds:06.3f}"

    return f"{signo}{seconds:.3f}"


def records(frame: pd.DataFrame) -> list[dict]:
    """DataFrame -> list of JSON-safe dicts (NaN becomes null).

    Timedelta columns are formatted first: pandas would otherwise render them
    as ISO-8601 durations, which is not what anyone wants to read on a timing
    screen.
    """
    if frame is None or frame.empty:
        return []

    frame = frame.copy()

    for column in frame.columns:
        if pd.api.types.is_timedelta64_dtype(frame[column]):
            frame[column] = frame[column].map(format_lap_time)

    return json.loads(frame.to_json(orient="records", date_format="iso"))


def scalar(value):
    """Single value -> JSON-safe scalar."""
    if value is None or pd.isna(value):
        return None

    if hasattr(value, "item"):
        return value.item()

    return value
