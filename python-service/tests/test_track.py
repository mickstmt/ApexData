"""
Pruebas de la conversión de trazado y estrategia.

Sin red: se arman DataFrames a mano, que es justo lo que permite separar esta
lógica de las rutas.
"""

import pandas as pd

from app.utils.track import (
    downsample,
    group_by_driver,
    stints_from_laps,
    track_points,
)


def test_downsample_respeta_los_extremos():
    puntos = [{"x": i} for i in range(1000)]

    muestra = downsample(puntos, 100)

    assert len(muestra) == 100
    assert muestra[0] == puntos[0]
    # Sin esto el trazado se dibuja abierto: falta el tramo de vuelta a meta.
    assert muestra[-1] == puntos[-1]


def test_downsample_no_toca_lo_que_ya_cabe():
    puntos = [{"x": i} for i in range(50)]

    assert downsample(puntos, 600) == puntos


def test_track_points_recorta_y_conserva_la_velocidad():
    telemetria = pd.DataFrame(
        {
            "X": [float(i) for i in range(2000)],
            "Y": [float(i * 2) for i in range(2000)],
            "Speed": [200.0 + i % 50 for i in range(2000)],
        }
    )

    puntos = track_points(telemetria, limit=300)

    assert len(puntos) == 300
    assert set(puntos[0]) == {"x", "y", "speed"}
    assert puntos[0]["x"] == 0.0
    assert puntos[-1]["x"] == 1999.0


def test_track_points_descarta_muestras_sin_posicion():
    telemetria = pd.DataFrame(
        {
            "X": [1.0, None, 3.0],
            "Y": [1.0, 2.0, 3.0],
            "Speed": [100.0, 110.0, 120.0],
        }
    )

    assert len(track_points(telemetria)) == 2


def test_track_points_con_telemetria_sin_posicion():
    # Algunas sesiones antiguas no traen X/Y: mejor una lista vacía que un 500.
    assert track_points(pd.DataFrame({"Speed": [100.0]})) == []


def _laps(filas):
    return pd.DataFrame(filas, columns=["Driver", "Stint", "Compound", "LapNumber"])


def test_stints_agrupa_por_juego_de_neumaticos():
    laps = _laps(
        [
            ["VER", 1, "SOFT", 1],
            ["VER", 1, "SOFT", 2],
            ["VER", 1, "SOFT", 3],
            ["VER", 2, "HARD", 4],
            ["VER", 2, "HARD", 5],
        ]
    )

    tramos = stints_from_laps(laps)

    assert tramos == [
        {"driver": "VER", "stint": 1, "compound": "SOFT", "start_lap": 1, "end_lap": 3, "laps": 3},
        {"driver": "VER", "stint": 2, "compound": "HARD", "start_lap": 4, "end_lap": 5, "laps": 2},
    ]


def test_stints_sin_compuesto_no_inventa_uno():
    laps = _laps([["HAM", 1, None, 1], ["HAM", 1, None, 2]])

    assert stints_from_laps(laps)[0]["compound"] == "UNKNOWN"


def test_stints_descarta_vueltas_sin_tramo():
    laps = _laps([["LEC", None, "SOFT", 1], ["LEC", 1, "SOFT", 2]])

    tramos = stints_from_laps(laps)

    assert len(tramos) == 1
    assert tramos[0]["start_lap"] == 2


def test_group_by_driver_respeta_el_orden_de_llegada():
    tramos = stints_from_laps(
        _laps(
            [
                ["ALO", 1, "SOFT", 1],
                ["VER", 1, "SOFT", 1],
                ["HAM", 1, "MEDIUM", 1],
            ]
        )
    )

    agrupado = group_by_driver(tramos, order=["VER", "HAM", "ALO"])

    assert [g["driver"] for g in agrupado] == ["VER", "HAM", "ALO"]


def test_group_by_driver_pone_al_final_a_quien_no_esta_en_el_orden():
    tramos = stints_from_laps(_laps([["VER", 1, "SOFT", 1], ["ZHO", 1, "SOFT", 1]]))

    agrupado = group_by_driver(tramos, order=["VER"])

    assert [g["driver"] for g in agrupado] == ["VER", "ZHO"]


# --- Identificación del Gran Premio ---

from app.utils.events import event_key


def test_event_key_convierte_la_ronda_en_entero():
    # El fallo que esto evita: FastF1 decide por el TIPO. Con "11" hace
    # coincidencia por nombre y carga el Gran Premio de Australia en vez de la
    # ronda 11, sin dar error: solo datos de otra carrera.
    assert event_key("11") == 11
    assert event_key(11) == 11
    assert event_key(" 7 ") == 7


def test_event_key_deja_los_nombres_como_texto():
    assert event_key("Bahrain") == "Bahrain"
    assert event_key("Monaco Grand Prix") == "Monaco Grand Prix"
