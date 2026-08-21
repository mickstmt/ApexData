"""
Pruebas del orden de una clasificación reconstruida.

Sin red: los tramos se arman a mano, que es justo lo que permite probar el caso
que importa —que el tramo mande sobre el crono— sin esperar a un sábado de
carrera.
"""

import pandas as pd

from app.utils.classification import build_classification


def tramo(pares: list[tuple[str, str]]) -> pd.DataFrame:
    """[(piloto, tiempo)] -> el marco de vueltas de un tramo."""
    return pd.DataFrame(
        {
            "Driver": [piloto for piloto, _ in pares],
            "LapTime": pd.to_timedelta([tiempo for _, tiempo in pares]),
        }
    )


class TestOrden:
    def test_ordena_por_tiempo_dentro_de_un_tramo(self):
        orden = build_classification([tramo([("VER", "0:01:11.5"), ("NOR", "0:01:11.2")])])

        assert [fila["driver"] for fila in orden] == ["NOR", "VER"]
        assert [fila["position"] for fila in orden] == [1, 2]

    def test_el_tramo_manda_sobre_el_crono(self):
        # El caso que hace que esto no sea «ordenar por mejor vuelta»: STR marca
        # el mejor tiempo absoluto pero se queda en el primer tramo, así que sale
        # detrás de los dos que llegaron al segundo.
        orden = build_classification(
            [
                tramo([("STR", "0:01:10.0"), ("VER", "0:01:12.0"), ("NOR", "0:01:12.5")]),
                tramo([("VER", "0:01:11.9"), ("NOR", "0:01:11.4")]),
            ]
        )

        assert [fila["driver"] for fila in orden] == ["NOR", "VER", "STR"]
        assert [fila["segment"] for fila in orden] == [2, 2, 1]

    def test_cada_piloto_aparece_una_sola_vez(self):
        orden = build_classification(
            [
                tramo([("VER", "0:01:12.0"), ("NOR", "0:01:12.5")]),
                tramo([("VER", "0:01:11.9"), ("NOR", "0:01:11.4")]),
            ]
        )

        assert len(orden) == 2

    def test_se_queda_con_la_mejor_vuelta_de_cada_uno(self):
        orden = build_classification(
            [tramo([("VER", "0:01:13.0"), ("VER", "0:01:11.8"), ("NOR", "0:01:12.0")])]
        )

        assert orden[0]["driver"] == "VER"
        assert orden[0]["time"] == "1:11.800"

    def test_las_vueltas_sin_tiempo_no_cuentan(self):
        vueltas = tramo([("VER", "0:01:12.0"), ("NOR", "0:01:11.0")])
        vueltas.loc[1, "LapTime"] = pd.NaT

        orden = build_classification([vueltas])

        assert [fila["driver"] for fila in orden] == ["VER"]

    def test_un_tramo_vacio_no_estorba(self):
        orden = build_classification([tramo([("VER", "0:01:12.0")]), None, tramo([])])

        assert [fila["driver"] for fila in orden] == ["VER"]


class TestPilotos:
    def test_pone_nombre_y_equipo(self):
        orden = build_classification(
            [tramo([("VER", "0:01:12.0")])],
            {"VER": {"driverName": "Max Verstappen", "team": "Red Bull Racing", "number": "1"}},
        )

        assert orden[0]["driverName"] == "Max Verstappen"
        assert orden[0]["team"] == "Red Bull Racing"

    def test_quien_no_marco_tiempo_sale_al_final_sin_tiempo(self):
        # Desaparecer de la parrilla sería peor que salir el último: quien mira
        # cuenta veintidós coches.
        orden = build_classification(
            [tramo([("VER", "0:01:12.0")])],
            {"VER": {"driverName": "Max Verstappen"}, "ALO": {"driverName": "Fernando Alonso"}},
        )

        assert [fila["driver"] for fila in orden] == ["VER", "ALO"]
        assert orden[1]["time"] is None
        assert orden[1]["segment"] is None
        assert orden[1]["position"] == 2

    def test_sin_detalles_se_queda_con_el_codigo(self):
        orden = build_classification([tramo([("VER", "0:01:12.0")])])

        assert orden[0]["driverName"] == "VER"
        assert orden[0]["team"] is None
