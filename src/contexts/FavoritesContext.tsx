'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import type { Favoritos } from '@/lib/cuentas/favoritos';
import { sincronizar } from '@/lib/cuentas/sincronizar';

interface FavoritesContextType {
  favoriteDrivers: string[];
  favoriteConstructors: string[];
  toggleDriverFavorite: (driverId: string) => void;
  toggleConstructorFavorite: (constructorId: string) => void;
  isDriverFavorite: (driverId: string) => boolean;
  isConstructorFavorite: (constructorId: string) => boolean;
  /**
   * El equipo que tiñe el acento de la app. Es uno solo y aparte de la lista de
   * equipos favoritos: seguir a cinco equipos es razonable, pero el color de la
   * interfaz solo puede ser de uno.
   */
  equipoAcento: string | null;
  elegirEquipoAcento: (constructorId: string | null) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY_DRIVERS = 'apexdata_favorite_drivers';
const STORAGE_KEY_CONSTRUCTORS = 'apexdata_favorite_constructors';
const STORAGE_KEY_ACENTO = 'apexdata_equipo_acento';

/**
 * Cuánto se espera antes de subir un cambio.
 *
 * Marcar varios pilotos seguidos es un gesto, no varios: 800 ms es más de lo
 * que se tarda entre dos toques y menos de lo que nadie nota.
 */
const ESPERA_ANTES_DE_SUBIR = 800;

/** El acento, en el navegador. A diferencia de las listas, se guarda a mano. */
function guardarAcento(constructorId: string | null) {
  try {
    if (constructorId) localStorage.setItem(STORAGE_KEY_ACENTO, constructorId);
    else localStorage.removeItem(STORAGE_KEY_ACENTO);
  } catch (error) {
    console.error('Error guardando el equipo del acento:', error);
  }
}

/**
 * Escribe los favoritos en la cuenta.
 *
 * No devuelve nada ni lanza: si la red falla, lo del navegador sigue siendo
 * correcto y el siguiente cambio volverá a intentarlo. La cuenta es una copia
 * que viaja, no la fuente de la verdad de esta pantalla.
 */
async function subir(favoritos: Favoritos) {
  try {
    await fetch('/api/favoritos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(favoritos),
    });
  } catch (error) {
    console.error('No se pudieron guardar los favoritos en la cuenta:', error);
  }
}

/**
 * Los favoritos, y el viaje a la cuenta de quien haya entrado.
 *
 * Sin cuenta esto funciona exactamente como siempre: `localStorage` y nada
 * más. Con cuenta se añaden dos cosas, y solo dos:
 *
 * 1. **Al abrir**, se piden los de la cuenta y se ponen de acuerdo con los del
 *    aparato. Quién gana lo decide `sincronizar`, que es puro y está probado,
 *    porque es la única parte capaz de perder lo que alguien marcó a mano.
 * 2. **Al cambiar algo**, se sube. Con un respiro de por medio: marcar cinco
 *    pilotos seguidos son cinco cambios de estado y una sola escritura.
 */
export function FavoritesProvider({
  children,
  hayCuenta = false,
}: {
  children: ReactNode;
  /** Si hay alguien dentro. Lo sabe el servidor; aquí solo se recibe. */
  hayCuenta?: boolean;
}) {
  const [favoriteDrivers, setFavoriteDrivers] = useState<string[]>([]);
  const [favoriteConstructors, setFavoriteConstructors] = useState<string[]>([]);
  const [equipoAcento, setEquipoAcento] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Hasta que no se haya hablado con la cuenta, no se sube nada.
   *
   * Sin esta marca, el efecto que guarda dispararía una subida con lo que
   * hubiera en el navegador nada más abrir — y eso pisaría la cuenta con el
   * aparato antes siquiera de haber mirado qué tenía la cuenta.
   */
  const [sincronizado, setSincronizado] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const savedDrivers = localStorage.getItem(STORAGE_KEY_DRIVERS);
      const savedConstructors = localStorage.getItem(STORAGE_KEY_CONSTRUCTORS);

      if (savedDrivers) {
        setFavoriteDrivers(JSON.parse(savedDrivers));
      }
      if (savedConstructors) {
        setFavoriteConstructors(JSON.parse(savedConstructors));
      }

      const acento = localStorage.getItem(STORAGE_KEY_ACENTO);
      if (acento) setEquipoAcento(acento);
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  /**
   * Poner de acuerdo el aparato y la cuenta, una vez al abrir.
   *
   * Solo cuando hay alguien dentro y solo después de haber leído el navegador:
   * al revés se compararía la cuenta contra unas listas vacías y el resultado
   * sería «bajar» siempre, borrando lo del aparato.
   */
  useEffect(() => {
    if (!isLoaded) return;

    if (!hayCuenta) {
      setSincronizado(true);
      return;
    }

    let vigente = true;

    (async () => {
      try {
        const respuesta = await fetch('/api/favoritos');
        if (!respuesta.ok) throw new Error(String(respuesta.status));

        const deLaCuenta = (await respuesta.json()) as Favoritos;
        if (!vigente) return;

        const aparato: Favoritos = {
          pilotos: favoriteDrivers,
          equipos: favoriteConstructors,
          acento: equipoAcento,
        };

        const { resultado, hayQueSubir } = sincronizar(aparato, deLaCuenta);

        setFavoriteDrivers(resultado.pilotos);
        setFavoriteConstructors(resultado.equipos);
        setEquipoAcento(resultado.acento);
        guardarAcento(resultado.acento);

        if (hayQueSubir) await subir(resultado);
      } catch (error) {
        // Que falle la cuenta no puede dejar a nadie sin sus favoritos: los del
        // navegador siguen ahí y la app funciona igual que sin entrar.
        console.error('No se pudieron sincronizar los favoritos:', error);
      } finally {
        if (vigente) setSincronizado(true);
      }
    })();

    return () => {
      vigente = false;
    };
    // A propósito solo depende de si hay cuenta y de si ya se leyó el
    // navegador: es una operación de apertura, no algo que deba repetirse cada
    // vez que se marca un piloto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayCuenta, isLoaded]);

  /**
   * Y al cambiar algo, subirlo — con un respiro.
   *
   * Marcar cinco pilotos seguidos son cinco cambios de estado; sin la espera
   * serían cinco escrituras en la base para dejar lo mismo que deja una.
   */
  useEffect(() => {
    if (!hayCuenta || !sincronizado) return;

    const temporizador = setTimeout(() => {
      void subir({
        pilotos: favoriteDrivers,
        equipos: favoriteConstructors,
        acento: equipoAcento,
      });
    }, ESPERA_ANTES_DE_SUBIR);

    return () => clearTimeout(temporizador);
  }, [favoriteDrivers, favoriteConstructors, equipoAcento, hayCuenta, sincronizado]);

  // Save drivers to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(favoriteDrivers));
      } catch (error) {
        console.error('Error saving driver favorites:', error);
      }
    }
  }, [favoriteDrivers, isLoaded]);

  // Save constructors to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_CONSTRUCTORS, JSON.stringify(favoriteConstructors));
      } catch (error) {
        console.error('Error saving constructor favorites:', error);
      }
    }
  }, [favoriteConstructors, isLoaded]);

  const toggleDriverFavorite = (driverId: string) => {
    setFavoriteDrivers((prev) =>
      prev.includes(driverId)
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId]
    );
  };

  const toggleConstructorFavorite = (constructorId: string) => {
    setFavoriteConstructors((prev) =>
      prev.includes(constructorId)
        ? prev.filter((id) => id !== constructorId)
        : [...prev, constructorId]
    );
  };

  const isDriverFavorite = (driverId: string) => {
    return favoriteDrivers.includes(driverId);
  };

  const isConstructorFavorite = (constructorId: string) => {
    return favoriteConstructors.includes(constructorId);
  };

  const elegirEquipoAcento = (constructorId: string | null) => {
    setEquipoAcento(constructorId);
    guardarAcento(constructorId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteDrivers,
        favoriteConstructors,
        toggleDriverFavorite,
        toggleConstructorFavorite,
        isDriverFavorite,
        isConstructorFavorite,
        equipoAcento,
        elegirEquipoAcento,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
