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
    """Timedelta -> "M:SS.mmm", the way lap and sector times are read."""
    if value is None or pd.isna(value):
        return None

    total = value.total_seconds()
    minutes, seconds = divmod(total, 60)

    if minutes:
        return f"{int(minutes)}:{seconds:06.3f}"

    return f"{seconds:.3f}"


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
