"""
Pruebas del remuestreo de posiciones para el replay.

Sin red: los DataFrames se arman a mano, que es lo que permite probar la
interpolación y la forma del bloque sin bajar una carrera.
"""

import numpy as np
import pandas as pd

from app.utils.positions import (
    PASO,
    SIN_DATO,
    cruces_de_vuelta,
    estados_relativos,
    linea_de_tiempo,
    remuestrear,
)


def _coche(tiempos, xs, ys):
    return pd.DataFrame(
        {"SessionTime": pd.to_timedelta(tiempos, unit="s"), "X": xs, "Y": ys}
    )


def _leer(bloque: bytes, pilotos: int, n: int) -> np.ndarray:
    """El bloque tal como lo va a indexar el navegador: [piloto][x|y][instante]."""
    return np.frombuffer(bloque, dtype="<i2").reshape(pilotos, 2, n)


def test_linea_de_tiempo_llega_hasta_el_final():
    t = linea_de_tiempo(100.0, 101.0)

    assert t[0] == 100.0
    assert t[-1] == 101.0
    assert len(t) == 5
    assert np.allclose(np.diff(t), PASO)


def test_remuestrear_interpola_entre_muestras():
    pos = {"1": _coche([0.0, 1.0], [0.0, 100.0], [10.0, 30.0])}
    timeline = np.array([0.0, 0.5, 1.0])

    datos = _leer(remuestrear(pos, ["1"], timeline), 1, 3)

    assert datos[0, 0].tolist() == [0, 50, 100]
    assert datos[0, 1].tolist() == [10, 20, 30]


def test_remuestrear_marca_sin_dato_fuera_del_rango_del_coche():
    # Antes de su primera muestra y después de la última no hay posición, y
    # extenderla en plano dejaría a un retirado clavado en pista hasta el final.
    pos = {"1": _coche([1.0, 2.0], [5.0, 6.0], [7.0, 8.0])}
    timeline = np.array([0.0, 1.0, 2.0, 3.0])

    datos = _leer(remuestrear(pos, ["1"], timeline), 1, 4)

    assert datos[0, 0].tolist() == [SIN_DATO, 5, 6, SIN_DATO]
    assert datos[0, 1].tolist() == [SIN_DATO, 7, 8, SIN_DATO]


def test_remuestrear_respeta_el_orden_de_pilotos_y_el_tamano():
    pos = {
        "44": _coche([0.0, 1.0], [1.0, 1.0], [1.0, 1.0]),
        "1": _coche([0.0, 1.0], [2.0, 2.0], [2.0, 2.0]),
    }
    timeline = np.array([0.0, 0.5, 1.0])

    bloque = remuestrear(pos, ["1", "44"], timeline)

    # pilotos × (x, y) × instantes × 2 bytes: es lo que el cliente comprueba
    # antes de fiarse del bloque.
    assert len(bloque) == 2 * 2 * 3 * 2
    datos = _leer(bloque, 2, 3)
    assert datos[0, 0].tolist() == [2, 2, 2]
    assert datos[1, 0].tolist() == [1, 1, 1]


def test_remuestrear_deja_hueco_al_piloto_sin_datos():
    pos = {"1": _coche([0.0, 1.0], [0.0, 0.0], [0.0, 0.0])}
    timeline = np.array([0.0, 1.0])

    datos = _leer(remuestrear(pos, ["1", "99"], timeline), 2, 2)

    assert datos[1, 0].tolist() == [SIN_DATO, SIN_DATO]


def test_remuestrear_tolera_muestras_repetidas():
    # La fuente trae algún instante duplicado; `np.interp` exige tiempos
    # crecientes y sin esto devolvía basura en silencio.
    pos = {"1": _coche([0.0, 0.0, 1.0], [0.0, 0.0, 10.0], [0.0, 0.0, 10.0])}

    datos = _leer(remuestrear(pos, ["1"], np.array([0.5])), 1, 1)

    assert datos[0, 0].tolist() == [5]


def test_remuestrear_recorta_en_vez_de_desbordar():
    pos = {"1": _coche([0.0, 1.0], [40000.0, 40000.0], [-40000.0, -40000.0])}

    datos = _leer(remuestrear(pos, ["1"], np.array([0.5])), 1, 1)

    assert datos[0, 0].tolist() == [32767]
    assert datos[0, 1].tolist() == [SIN_DATO + 1]


def test_cruces_de_vuelta_relativos_y_sin_nat():
    laps = pd.DataFrame({"Time": pd.to_timedelta([110.0, 190.0, np.nan], unit="s")})

    assert cruces_de_vuelta(laps, 100.0) == [10.0, 90.0]


def test_estados_relativos_cierra_cada_tramo_con_el_siguiente():
    estados = pd.DataFrame(
        {
            "Time": pd.to_timedelta([90.0, 120.0, 150.0], unit="s"),
            "Status": [1, 2, 1],
        }
    )

    tramos = estados_relativos(estados, inicio=100.0, fin=200.0)

    # El vigente al salir empieza en cero; el último dura hasta la bandera.
    assert tramos == [
        {"status": "1", "start": 0.0, "end": 20.0},
        {"status": "2", "start": 20.0, "end": 50.0},
        {"status": "1", "start": 50.0, "end": 100.0},
    ]


def test_estados_relativos_tira_lo_que_acabo_antes_de_la_salida():
    estados = pd.DataFrame(
        {"Time": pd.to_timedelta([10.0, 50.0], unit="s"), "Status": [2, 1]}
    )

    tramos = estados_relativos(estados, inicio=100.0, fin=200.0)

    assert [t["status"] for t in tramos] == ["1"]
