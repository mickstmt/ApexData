"""
Trazado del circuito y estrategia de neumáticos.

Las dos cosas que faltaban del Sprint 4 comparten una necesidad: convertir lo
que FastF1 devuelve —miles de muestras por vuelta, una fila por vuelta— en algo
que quepa en una respuesta y que un navegador pueda dibujar sin ahogarse. Esa
conversión vive aquí, separada de las rutas, porque es la parte que se puede
probar sin bajar una sesión entera de internet.
"""

from typing import Iterable


def downsample(points: list[dict], limit: int) -> list[dict]:
    """Reduce una traza a `limit` puntos conservando el primero y el último.

    Una vuelta trae del orden de 5.000 muestras. Para dibujar el trazado no
    hacen falta: a partir de ~600 puntos la línea ya no gana forma y sí gana
    peso — y ese peso viaja entero hasta el móvil.
    """
    if limit < 2 or len(points) <= limit:
        return list(points)

    paso = (len(points) - 1) / (limit - 1)
    muestra = [points[round(indice * paso)] for indice in range(limit)]

    # El último punto cierra el circuito: se fuerza por si el redondeo lo deja
    # fuera, porque un trazado abierto se ve roto.
    if muestra[-1] is not points[-1]:
        muestra[-1] = points[-1]

    return muestra


def track_points(telemetry, limit: int = 600) -> list[dict]:
    """Coordenadas de la vuelta con su velocidad, listas para pintar.

    FastF1 da X e Y en decímetros y con el circuito en la orientación en que se
    grabó. Aquí solo se recortan y redondean: girar el trazado y escalarlo es
    cosa de quien lo dibuja, que es el único que sabe el tamaño del lienzo.
    """
    columnas = {"X", "Y", "Speed"}
    if telemetry is None or telemetry.empty or not columnas.issubset(telemetry.columns):
        return []

    limpio = telemetry.dropna(subset=["X", "Y", "Speed"])

    puntos = [
        {
            "x": float(fila.X),
            "y": float(fila.Y),
            "speed": round(float(fila.Speed), 1),
        }
        for fila in limpio.itertuples()
    ]

    return downsample(puntos, limit)


def stints_from_laps(laps) -> list[dict]:
    """Un tramo por cada juego de neumáticos montado, por piloto.

    FastF1 numera los stints por vuelta; lo que interesa mostrar es el tramo:
    con qué compuesto, desde qué vuelta hasta cuál, y cuántas vueltas duró.
    Las vueltas sin número de stint —datos incompletos de sesiones antiguas— se
    descartan en vez de inventarles uno.
    """
    columnas = {"Driver", "Stint", "Compound", "LapNumber"}
    if laps is None or laps.empty or not columnas.issubset(laps.columns):
        return []

    utiles = laps.dropna(subset=["Driver", "Stint", "LapNumber"])

    tramos: dict[tuple[str, int], dict] = {}
    for fila in utiles.itertuples():
        clave = (str(fila.Driver), int(fila.Stint))
        vuelta = int(fila.LapNumber)
        compuesto = str(fila.Compound) if _tiene_valor(fila.Compound) else "UNKNOWN"

        tramo = tramos.get(clave)
        if tramo is None:
            tramos[clave] = {
                "driver": str(fila.Driver),
                "stint": int(fila.Stint),
                "compound": compuesto,
                "start_lap": vuelta,
                "end_lap": vuelta,
                "laps": 1,
            }
            continue

        tramo["start_lap"] = min(tramo["start_lap"], vuelta)
        tramo["end_lap"] = max(tramo["end_lap"], vuelta)
        tramo["laps"] += 1

    return sorted(tramos.values(), key=lambda t: (t["driver"], t["stint"]))


def group_by_driver(stints: Iterable[dict], order: list[str] | None = None) -> list[dict]:
    """Agrupa los tramos por piloto, en el orden en que acabaron la carrera.

    Sin ese orden la lista sale alfabética, que en un gráfico de estrategia no
    dice nada: lo que se compara es al ganador contra los de atrás.
    """
    por_piloto: dict[str, list[dict]] = {}
    for tramo in stints:
        por_piloto.setdefault(tramo["driver"], []).append(tramo)

    conocidos = [d for d in (order or []) if d in por_piloto]
    resto = sorted(d for d in por_piloto if d not in conocidos)

    return [
        {"driver": piloto, "stints": por_piloto[piloto]}
        for piloto in [*conocidos, *resto]
    ]


def _tiene_valor(valor) -> bool:
    if valor is None:
        return False
    # NaN es el único valor que no es igual a sí mismo.
    return valor == valor and str(valor).strip() != ""
