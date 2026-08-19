"""
Identificación del Gran Premio.

FastF1 acepta el evento como número de ronda (`int`) o como nombre (`str`), y
decide qué hacer **por el tipo**, no por el contenido. Un `"11"` que llega por
la URL es una cadena, así que lo trata como nombre y lo hace coincidir por
parecido: registra `Correcting user input '11' to 'Australian Grand Prix'` y
carga una sesión que no es la pedida.

El síntoma no era un error, que sería fácil de ver, sino datos de otra carrera:
telemetría "sin vueltas" para un piloto que sí corrió, comparaciones
imposibles, y tiempos que no eran los de la sesión elegida.
"""


def event_key(event: str | int) -> str | int:
    """Ronda como entero, nombre como texto — que es lo que FastF1 distingue."""
    if isinstance(event, int):
        return event

    limpio = str(event).strip()

    return int(limpio) if limpio.isdigit() else limpio
