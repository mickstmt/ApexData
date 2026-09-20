import { Calculadora } from '@/components/calculadora/Calculadora';

/**
 * La calculadora científica, en una pantalla que existe pero no se anuncia.
 *
 * ## Por qué no está en la navegación
 *
 * Porque no es una sección de ApexData: aquí no hay datos de Fórmula 1, no
 * sale de ninguna fuente y no encaja en el menú entre «Circuitos» y
 * «Telemetría». Se llega escribiendo `/calculadora` y punto, que es justo lo
 * que se pidió.
 *
 * Esconderla es una decisión de tres piezas, y las tres hacen falta:
 *
 * 1. No aparece en `navItems` (`src/config/site.ts`), que es de donde beben
 *    los tres sitios que navegan —el raíl, la hoja de la cabecera y la barra
 *    del móvil—. Con no añadirla ahí, no se pinta en ninguno.
 * 2. `robots: noindex, nofollow` le dice a los buscadores que no la listen.
 *    Sin esto la pantalla seguiría sin estar en el menú, pero acabaría en
 *    Google, que es otra forma de estar a la vista.
 * 3. No hay ningún enlace hacia ella en toda la app. Una página sin enlaces
 *    entrantes no se encuentra por casualidad.
 *
 * Lo que NO es: una pantalla protegida. Quien sepa la dirección, entra. Si
 * algún día tuviera que ser privada de verdad, eso es cosa del middleware y de
 * la sesión, no de esconder el enlace.
 */

export const metadata = {
  title: 'Calculadora científica | ApexData',
  description: 'Una calculadora científica completa, con la librea del equipo.',
  robots: { index: false, follow: false },
};

export default function CalculadoraPage() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      <Calculadora />
    </div>
  );
}
