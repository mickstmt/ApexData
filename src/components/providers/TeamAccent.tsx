'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useFavorites } from '@/contexts/FavoritesContext';
import { tokensDeAcento } from '@/lib/team-accent';

const CLAVES = ['--primary', '--primary-foreground', '--ring', '--ambiente'] as const;

/**
 * Tiñe la app entera con el color del equipo elegido.
 *
 * No pinta nada: escribe cuatro variables en el documento. Como los tokens de
 * ApexData son canales HSL y todo lo demás los usa —`text-primary`,
 * `bg-primary`, el anillo de foco, las gráficas—, cambiarlas aquí basta para
 * que el acento recorra la aplicación sin tocar un solo componente.
 *
 * Depende del tema resuelto porque el acento se deriva por fondo: el mismo
 * equipo necesita una tinta en claro y otra en oscuro para seguir leyéndose.
 */
export function TeamAccent() {
  const { equipoAcento } = useFavorites();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const raiz = document.documentElement;
    const tokens = tokensDeAcento(equipoAcento, resolvedTheme === 'dark');

    // Sin equipo elegido se quitan las variables y vuelve el verde de la marca,
    // que es lo que dicen las reglas de `globals.css`.
    if (!tokens) {
      CLAVES.forEach((clave) => raiz.style.removeProperty(clave));
      return;
    }

    Object.entries(tokens).forEach(([clave, valor]) => raiz.style.setProperty(clave, valor));

    return () => CLAVES.forEach((clave) => raiz.style.removeProperty(clave));
  }, [equipoAcento, resolvedTheme]);

  /*
   * Las filas de tu equipo, teñidas.
   *
   * Va como regla y no como estilo en cada fila porque hay que **comparar** dos
   * valores —el equipo de la fila y el elegido— y eso CSS no lo hace con
   * selectores de atributo. Con la regla escrita a la medida del equipo
   * elegido, cada fila solo necesita decir de quién es (`data-equipo`), sigue
   * siendo servidor y sobrevive a la navegación.
   */
  if (!equipoAcento) return null;

  return (
    <style>{`[data-equipo="${CSS.escape(equipoAcento)}"] {
      background-color: hsl(var(--ambiente) / 0.12);
      border-color: hsl(var(--ambiente) / 0.45);
    }`}</style>
  );
}
