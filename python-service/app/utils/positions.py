"""
Las posiciones de todos los coches a lo largo de una carrera, listas para
reproducirse.

Es la materia prima del replay: la F1 graba dónde está cada coche unas cuatro
veces por segundo, y con eso se puede volver a ver la carrera con los veinte
puntos moviéndose sobre el trazado.

## Por qué no se manda tal cual

Cada coche llega con su propio reloj: muestras a intervalos irregulares —241 ms
de mediana, pero con huecos de dos segundos— y ninguna coincide con las de los
demás. Para animar hace falta preguntar «¿dónde estaba cada uno en ESTE
instante?», y eso exige una línea de tiempo común. Aquí se construye y se
interpola cada coche sobre ella.

## Por qué binario

Una carrera son 30 000 instantes por 22 coches. En JSON son diez millones de
caracteres que el teléfono tiene que parsear; en enteros de 16 bits son 2,6 MB
que el navegador lee como un `Int16Array` sin parsear nada, y comprimidos viajan
en 1,5 MB. Las coordenadas vienen en decímetros y caben de sobra: medido,
−1015…8703.

## La forma del bloque

Para cada piloto, en el orden que dice el `meta`: `N` enteros `x` y después `N`
enteros `y`, little-endian. Nada más. El `meta` dice cuánto vale `N`, cuándo
empieza la línea de tiempo y cada cuánto avanza, así que el bloque no necesita
cabecera propia. `SIN_DATO` marca los instantes en que ese coche no tiene
posición: antes de su primera muestra o después de la última.
"""

import numpy as np
import pandas as pd

# La frecuencia nativa de la F1 son ~3,8 Hz; remuestrear a 4 Hz no inventa
# nada y bajar a 2 tira la mitad de lo grabado, que en las curvas se nota.
PASO = 0.25

# Fuera del rango de int16 útil, para que no se confunda con una coordenada.
SIN_DATO = -32768


def linea_de_tiempo(inicio: float, fin: float, paso: float = PASO) -> np.ndarray:
    """Los instantes de la carrera, en segundos de sesión, desde `inicio` a `fin`."""
    if fin <= inicio:
        return np.array([inicio])
    return np.arange(inicio, fin + paso / 2, paso)


def _segundos(serie: pd.Series) -> np.ndarray:
    """Timedelta o ya-segundos -> float. Las pruebas arman lo segundo a mano."""
    if pd.api.types.is_timedelta64_dtype(serie):
        return serie.dt.total_seconds().to_numpy(dtype=float)
    return serie.to_numpy(dtype=float)


def remuestrear(pos_data: dict, orden: list[str], timeline: np.ndarray) -> bytes:
    """Todos los coches sobre la misma línea de tiempo, como bloque binario.

    Un piloto sin datos —o fuera de `pos_data`— ocupa su sitio igual, lleno de
    `SIN_DATO`: así el bloque siempre mide `len(orden) × 2 × N × 2` bytes y el
    cliente puede indexarlo por posición sin buscar.
    """
    n = len(timeline)
    bloques: list[np.ndarray] = []

    for numero in orden:
        frame = pos_data.get(numero) if pos_data else None

        if frame is None or len(frame) == 0:
            vacio = np.full(n, SIN_DATO, dtype="<i2")
            bloques.extend((vacio, vacio))
            continue

        t = _segundos(frame["SessionTime"])
        # Ordenadas y sin repetidos: `np.interp` exige tiempos crecientes, y la
        # fuente trae alguna muestra duplicada.
        t, indices = np.unique(t, return_index=True)
        x = frame["X"].to_numpy(dtype=float)[indices]
        y = frame["Y"].to_numpy(dtype=float)[indices]

        fuera = (timeline < t[0]) | (timeline > t[-1])

        for canal in (x, y):
            valores = np.interp(timeline, t, canal)
            # Un decímetro más allá del rango se recorta al borde en vez de
            # desbordar el entero y aparecer en la otra punta del mapa.
            enteros = np.clip(np.rint(valores), SIN_DATO + 1, 32767).astype("<i2")
            enteros[fuera] = SIN_DATO
            bloques.append(enteros)

    return np.concatenate(bloques).tobytes()


def cruces_de_vuelta(laps_del_piloto, inicio: float) -> list[float]:
    """Cuándo cruzó la meta cada vuelta, en segundos desde el inicio.

    Es lo que permite saber en qué vuelta va cada coche en cualquier instante sin
    mandar un canal más por coche: se cuenta cuántos cruces quedan atrás. Y el
    último cruce es donde termina su carrera, que para un retirado es antes que
    para los demás.
    """
    if laps_del_piloto is None or len(laps_del_piloto) == 0:
        return []

    tiempos = laps_del_piloto["Time"]
    tiempos = tiempos[tiempos.notna()]

    return sorted(round(float(t) - inicio, 2) for t in _segundos(tiempos))


def estados_relativos(track_status, inicio: float, fin: float) -> list[dict]:
    """Los estados de pista como tramos cerrados, en segundos desde el inicio.

    FastF1 solo da cuándo EMPIEZA cada estado; el final es el principio del
    siguiente, y el último dura hasta la bandera. Lo anterior a la salida se
    recorta a cero en vez de tirarse: el estado vigente al salir cuenta.
    """
    if track_status is None or len(track_status) == 0:
        return []

    tiempos = _segundos(track_status["Time"]) - inicio
    codigos = [str(c) for c in track_status["Status"].tolist()]
    limite = fin - inicio

    tramos = []
    for i, (t, codigo) in enumerate(zip(tiempos, codigos)):
        siguiente = tiempos[i + 1] if i + 1 < len(tiempos) else limite
        comienzo = max(0.0, float(t))
        cierre = min(limite, float(siguiente))

        # Terminó antes de la salida: no le importa a nadie.
        if cierre <= 0:
            continue

        tramos.append({"status": codigo, "start": round(comienzo, 2), "end": round(cierre, 2)})

    return tramos
