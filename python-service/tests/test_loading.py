"""
Pruebas del cargador de sesiones.

Lo que se vigila aquí es que una carga larga **no deje al servicio sin atender
a nadie**. Antes, las rutas eran `async def` pero llamaban a `session.load()`
dentro, es decir, en el propio bucle de eventos: una sola petición pesada
bloqueaba el servicio entero durante todo lo que durase —36 segundos medidos la
primera vez que se pide una sesión—, incluida la comprobación de salud.

Sin red y sin FastF1: se sustituye la parte que descarga por una función lenta
de mentira, que es justo la frontera que importa.
"""

import asyncio
import time

import pytest

from app.utils import loading


@pytest.fixture(autouse=True)
def sin_memoria_entre_pruebas():
    """El veredicto «no hay datos» se cachea; entre pruebas hay que olvidarlo."""
    guardado = {}
    loading.cache_manager.get = lambda clave: guardado.get(clave)
    loading.cache_manager.set = lambda clave, valor, ttl=None: guardado.__setitem__(clave, valor)
    yield
    guardado.clear()


class TestNoBloqueaElServicio:
    @pytest.mark.anyio
    async def test_el_bucle_sigue_atendiendo_durante_una_carga_larga(self, monkeypatch):
        def lenta(*_args, **_kwargs):
            time.sleep(0.4)  # bloqueante a propósito: es lo que hace `session.load()`
            return "sesion"

        monkeypatch.setattr(loading, "_cargar", lenta)

        latidos = 0

        async def salud():
            """Lo que haría la comprobación de salud mientras tanto."""
            nonlocal latidos
            for _ in range(20):
                await asyncio.sleep(0.02)
                latidos += 1

        sesion, _ = await asyncio.gather(
            loading.load_session(2024, "Monza", "R"),
            salud(),
        )

        assert sesion == "sesion"
        # Si la carga corriera en el bucle, no habría latido ni una vez.
        assert latidos == 20

    @pytest.mark.anyio
    async def test_las_cargas_no_se_solapan(self, monkeypatch):
        """FastF1 no promete ser seguro entre hilos: van de una en una."""
        a_la_vez = 0
        maximo = 0

        def lenta(*_args, **_kwargs):
            nonlocal a_la_vez, maximo
            a_la_vez += 1
            maximo = max(maximo, a_la_vez)
            time.sleep(0.05)
            a_la_vez -= 1
            return "sesion"

        monkeypatch.setattr(loading, "_cargar", lenta)

        await asyncio.gather(*(loading.load_session(2024, f"GP{i}", "R") for i in range(4)))

        assert maximo == 1


class TestSinDatos:
    @pytest.mark.anyio
    async def test_una_sesion_sin_datos_da_404(self, monkeypatch):
        def vacia(*_args, **_kwargs):
            raise loading._SinDatos

        monkeypatch.setattr(loading, "_cargar", vacia)

        with pytest.raises(Exception) as fallo:
            await loading.load_session(2026, "20", "FP1")

        assert fallo.value.status_code == 404
        assert "todavía no tiene datos" in fallo.value.detail

    @pytest.mark.anyio
    async def test_no_se_reintenta_lo_que_ya_se_sabe(self, monkeypatch):
        """El defecto que esto fija: cada repetición volvía a costar 3,5 s."""
        intentos = 0

        def vacia(*_args, **_kwargs):
            nonlocal intentos
            intentos += 1
            raise loading._SinDatos

        monkeypatch.setattr(loading, "_cargar", vacia)

        for _ in range(5):
            with pytest.raises(Exception):
                await loading.load_session(2026, "20", "FP1")

        assert intentos == 1

    @pytest.mark.anyio
    async def test_cada_sesion_lleva_su_propia_cuenta(self, monkeypatch):
        intentos = []

        def vacia(year, event, session_type, **_kwargs):
            intentos.append((year, event, session_type))
            raise loading._SinDatos

        monkeypatch.setattr(loading, "_cargar", vacia)

        for sesion in ["FP1", "FP2", "R"]:
            with pytest.raises(Exception):
                await loading.load_session(2026, "20", sesion)

        assert len(intentos) == 3


@pytest.fixture
def anyio_backend():
    return "asyncio"
