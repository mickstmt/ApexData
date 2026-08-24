"""
Covers the serialization bugs that made the telemetry endpoints unusable.

All three were invisible until the service was actually exercised: a 500 with
no obvious cause, an error that replayed from cache, and lap times rendered as
ISO durations.
"""

import json
import math

import pandas as pd
import pytest

from app.utils.serialization import format_lap_time, records, scalar


class TestFormatLapTime:
    def test_formats_a_lap_as_minutes_and_seconds(self):
        assert format_lap_time(pd.Timedelta("0:01:29.165")) == "1:29.165"

    def test_pads_seconds_so_times_line_up(self):
        # 1:09.5 must not render as "1:9.500" — timing screens are read in a
        # column and a missing digit shifts everything.
        assert format_lap_time(pd.Timedelta("0:01:09.500")) == "1:09.500"

    def test_drops_the_minute_for_sector_times(self):
        assert format_lap_time(pd.Timedelta("0:00:28.843")) == "28.843"

    def test_handles_times_over_ten_minutes(self):
        assert format_lap_time(pd.Timedelta("0:12:34.567")) == "12:34.567"

    def test_returns_none_for_missing_values(self):
        assert format_lap_time(None) is None
        assert format_lap_time(pd.NaT) is None


class TestRecords:
    def test_converts_rows_to_dicts(self):
        frame = pd.DataFrame({"Driver": ["VER", "LEC"], "Speed": [318, 315]})

        assert records(frame) == [
            {"Driver": "VER", "Speed": 318},
            {"Driver": "LEC", "Speed": 315},
        ]

    def test_turns_nan_into_null(self):
        # Telemetry legitimately contains NaN — DistanceToDriverAhead has no
        # value while a driver leads — and a bare `nan` is not valid JSON, so
        # FastAPI failed to encode the whole response.
        frame = pd.DataFrame({"DistanceToDriverAhead": [float("nan"), 12.5]})

        rows = records(frame)

        assert rows[0]["DistanceToDriverAhead"] is None
        assert rows[1]["DistanceToDriverAhead"] == 12.5

    def test_output_is_json_encodable(self):
        frame = pd.DataFrame(
            {
                "Speed": [318, float("nan")],
                "LapTime": pd.to_timedelta(["0:01:29.165", None]),
                "Date": pd.to_datetime(["2024-03-02T15:00:00Z", "2024-03-02T15:00:01Z"]),
            }
        )

        # allow_nan=False is what FastAPI effectively enforces.
        encoded = json.dumps(records(frame), allow_nan=False)

        assert "NaN" not in encoded

    def test_formats_timedelta_columns_as_lap_times(self):
        # pandas would render these as ISO-8601 durations ("P0DT0H1M29.165S"),
        # which is what the fastest-laps table was printing.
        frame = pd.DataFrame({"LapTime": pd.to_timedelta(["0:01:29.165"])})

        assert records(frame) == [{"LapTime": "1:29.165"}]

    def test_returns_an_empty_list_for_no_data(self):
        assert records(pd.DataFrame()) == []
        assert records(None) == []


class TestScalar:
    def test_unwraps_numpy_values(self):
        value = scalar(pd.Series([42]).iloc[0])

        assert value == 42
        assert isinstance(value, int)

    def test_returns_none_for_missing_values(self):
        assert scalar(None) is None
        assert scalar(float("nan")) is None


class TestCacheGuard:
    """The cache stored a payload before FastAPI failed to encode it, so the
    error replayed on every later request until the cache file was deleted."""

    def test_rejects_payloads_containing_nan(self):
        with pytest.raises(ValueError):
            json.dumps({"speed": math.nan}, allow_nan=False)

    def test_accepts_a_sanitised_payload(self):
        frame = pd.DataFrame({"Speed": [float("nan"), 300]})
        payload = {"telemetry": records(frame)}

        assert json.dumps(payload, allow_nan=False)


class TestFormatLapTimeNegativo:
    """Una diferencia entre dos vueltas puede ser negativa, y salía sin sentido.

    `divmod(-0.455, 60)` es `(-1.0, 59.545)`, así que la diferencia de 0,455 s
    entre dos vueltas de clasificación se formateaba como «-1:59.545». Los
    tiempos de vuelta son siempre positivos, así que no se vio hasta que una
    comparación restó dos.
    """

    def test_una_diferencia_de_menos_de_un_minuto(self):
        # Se niega el Timedelta entero: pandas interpreta «-0 days …» como
        # positivo, así que escribir el signo dentro de la cadena no basta.
        assert format_lap_time(-pd.Timedelta("0:00:00.455")) == "-0.455"

    def test_una_diferencia_de_mas_de_un_minuto(self):
        assert format_lap_time(-pd.Timedelta("0:01:02.500")) == "-1:02.500"

    def test_es_lo_que_pasa_al_restar_dos_vueltas(self):
        # El caso real: NOR 1:11.163 contra VER 1:11.618 en Zandvoort. Daba
        # «-1:59.545».
        nor = pd.Timedelta("0:01:11.163")
        ver = pd.Timedelta("0:01:11.618")
        assert format_lap_time(nor - ver) == "-0.455"

    def test_el_positivo_no_cambia(self):
        assert format_lap_time(pd.Timedelta("0:00:00.455")) == "0.455"
        assert format_lap_time(pd.Timedelta("0:01:29.165")) == "1:29.165"

    def test_el_cero_no_lleva_signo(self):
        assert format_lap_time(pd.Timedelta(0)) == "0.000"
