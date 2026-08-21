"""
Rebuilding a qualifying order from the laps themselves.

The results source the site uses — Jolpica — never publishes sprint qualifying,
and publishes qualifying hours after the flag. FastF1 has the timing the moment
the session runs, so the order can be rebuilt from the laps.

Rebuilding it is not "sort by best lap". A qualifying result is banded by
segment: someone knocked out in SQ1 stays behind everyone who reached SQ2, even
on the rare occasion their time was quicker. FastF1 splits the segments itself,
so the split is not reimplemented — this only does the banding, which is the
part worth testing without a network.
"""

import pandas as pd

from app.utils.serialization import format_lap_time


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
