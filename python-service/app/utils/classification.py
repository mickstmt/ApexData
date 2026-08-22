"""
Rebuilding a qualifying order when the results source has none.

There are two ways of getting it and the good one comes first.

The results source the site uses — Jolpica — never publishes sprint qualifying,
and publishes qualifying hours after the flag. FastF1 has the timing the moment
the session runs, so the order can be rebuilt from the laps.

`from_results` reads the classification FastF1 works out itself. It only fills
it in when the race control messages are loaded, because **deleted laps** live
in those messages: without them a lap cancelled for track limits would still
count, and someone could be ranked by a time that was taken away. That is the
warning the service prints when the messages are missing.

`build_classification` is the fallback, for a session where even that fails. It
is not "sort by best lap": a qualifying result is banded by segment, and
someone knocked out in SQ1 stays behind everyone who reached SQ2 even on the
rare occasion their time was quicker. FastF1 splits the segments itself, so the
split is not reimplemented — this only does the banding.
"""

import pandas as pd

from app.utils.serialization import format_lap_time


SEGMENT_COLUMNS = ("Q1", "Q2", "Q3")


def from_results(results) -> list[dict]:
    """FastF1's own classification -> the same rows the endpoint returns.

    Empty when FastF1 could not work the order out, which is the signal to fall
    back to `build_classification`.
    """
    if results is None or len(results) == 0:
        return []

    if "Position" not in results.columns or results["Position"].isna().any():
        return []

    classification = []

    for _, row in results.sort_values("Position").iterrows():
        # The time shown is the one from the last segment reached, which is what
        # orders the grid — not the driver's best of the session.
        segment = None
        lap_time = pd.NaT

        for index, column in enumerate(SEGMENT_COLUMNS, start=1):
            if column in results.columns and not pd.isna(row[column]):
                segment = index
                lap_time = row[column]

        classification.append({
            "position": int(row["Position"]),
            "driver": row.get("Abbreviation"),
            "driverName": row.get("FullName") or row.get("Abbreviation"),
            "team": row.get("TeamName") or None,
            "number": _plain(row.get("DriverNumber")),
            "segment": segment,
            "time": format_lap_time(lap_time),
        })

    return classification


def _plain(value):
    if value is None or pd.isna(value):
        return None
    return value.item() if hasattr(value, "item") else value


def build_classification(segments, details: dict | None = None) -> list[dict]:
    """Segment frames (SQ1, SQ2, SQ3) -> the classified order.

    `details` maps a driver code to name/team/number. Anyone in it who never set
    a time still appears, at the back and without a time, rather than silently
    vanishing from the grid.
    """
    details = details or {}
    classification: list[dict] = []
    seen: set[str] = set()

    # Last segment first: reaching SQ3 puts a driver ahead of everyone who
    # stopped at SQ2, whatever the clock says.
    for index in range(len(segments) - 1, -1, -1):
        segment = segments[index]
        if segment is None or len(segment) == 0:
            continue

        laps = segment.pick_wo_box() if hasattr(segment, "pick_wo_box") else segment
        best = laps.groupby("Driver")["LapTime"].min().dropna().sort_values()

        for code, lap_time in best.items():
            if code in seen:
                continue
            seen.add(code)
            classification.append(_row(len(classification) + 1, code, details, index + 1, lap_time))

    for code in details:
        if code in seen:
            continue
        classification.append(_row(len(classification) + 1, code, details, None, pd.NaT))

    return classification


def _row(position: int, code: str, details: dict, segment: int | None, lap_time) -> dict:
    info = details.get(code, {})
    return {
        "position": position,
        "driver": code,
        "driverName": info.get("driverName", code),
        "team": info.get("team"),
        "number": info.get("number"),
        "segment": segment,
        "time": format_lap_time(lap_time),
    }
