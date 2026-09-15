import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El estado del proyecto, leído del CÓDIGO y no de un documento.
 *
 * ## Por qué existe
 *
 * Porque los documentos mienten y las notas no impiden nada. En dos días esto
 * pasó tres veces, siempre igual: una sesión leía `MEJORAS-PENDIENTES.md` o la
 * bitácora, los daba por el estado actual, y le decía al usuario que estaba
 * pendiente algo que llevaba semanas hecho. Se escribieron avisos en los tres
 * documentos y **la cuarta vez volvió a pasar** — con el despliegue del
 * servicio de telemetría, que se automatizó el 2026-08-24 y seguía anunciado
 * como manual el 2026-09-15.
 *
 * Un párrafo no puede fallar. Esto sí: cada afirmación de aquí abajo es una
 * **sonda sobre el repositorio**, y `ESTADO.md` se genera con ellas. Una prueba
 * compara el fichero generado con lo que sale al ejecutarlo, así que si alguien
 * cambia el código sin regenerar, **el CI se pone en rojo**.
 *
 * ## Cómo se usa
 *
 * - `npm run estado` — lo imprime y reescribe `ESTADO.md`.
 * - Al empezar una sesión, ANTES de opinar sobre qué falta.
 * - Al añadir una decisión nueva: se añade su sonda aquí, no una frase en un
 *   documento.
 */

/** Una afirmación que se puede comprobar mirando el repositorio. */
interface Sonda {
  /** Qué se está preguntando, en una línea. */
  pregunta: string;
  /**
   * La respuesta, leída del repo. `true` significa **hecho / automático / no
   * hay nada que hacer**; `false`, que sigue pendiente.
   */
  resuelta: (raiz: string) => boolean;
  /** Dónde mirar para comprobarlo a mano. Se imprime siempre. */
  evidencia: string;
  /** Qué decir cuando `resuelta` es verdadero, y qué cuando no. */
  siSi: string;
  siNo: string;
}

const leer = (raiz: string, ruta: string): string => {
  const completa = join(raiz, ruta);
  return existsSync(completa) ? readFileSync(completa, 'utf8') : '';
};

/**
 * Busca un texto en varios ficheros. Se listan uno a uno a propósito: un
 * recorrido por carpetas acabaría leyendo `node_modules` o `.venv`, y ahí
 * `team_radio` aparece dentro de la propia librería de FastF1 —pasó— y la
 * respuesta saldría al revés.
 */
const apareceEn = (raiz: string, rutas: string[], aguja: string): boolean =>
  rutas.some((ruta) => leer(raiz, ruta).includes(aguja));

export const SONDAS: Sonda[] = [
  {
    pregunta: '22 · Radios de equipo en el replay',
    resuelta: (raiz) =>
      apareceEn(
        raiz,
        ['src/services/openf1/client.ts', 'src/lib/csp.ts', 'python-service/app/routes/telemetry.py'],
        'team_radio'
      ),
    evidencia: '`team_radio` en el cliente de OpenF1 · `livetiming` en `src/lib/csp.ts`',
    siSi: 'HECHO',
    siNo: 'PENDIENTE — ⚠️ abre la CSP a `livetiming.formula1.com`: hay que avisar al usuario ANTES',
  },
  {
    pregunta: '18-bis · Los avisos de práctica, ¿salen por FastF1?',
    resuelta: (raiz) =>
      !leer(raiz, 'src/lib/push/avisos-de-sesion.ts').includes("sesion.tipo !== 'practica'"),
    evidencia: "`fastf1Puede` en `src/lib/push/avisos-de-sesion.ts`",
    siSi: 'HECHO',
    siNo: 'PENDIENTE — siguen por OpenF1, a los ~50 min. Medida limpia esperando a Azerbaiyán',
  },
  {
    pregunta: 'La maqueta de pruebas, ¿retirada de producción?',
    resuelta: (raiz) => !existsSync(join(raiz, 'public/maqueta')),
    evidencia: '`public/maqueta/`',
    siSi: 'HECHO',
    siNo: 'PENDIENTE — sigue servida en producción',
  },
  {
    pregunta: 'Pruebas de componente con jsdom',
    resuelta: (raiz) => leer(raiz, 'package.json').includes('"jsdom"'),
    evidencia: '`jsdom` en `package.json` · `environment` en `vitest.config.mts`',
    siSi: 'HECHO',
    siNo: 'PENDIENTE — decisión del usuario: «al final de todo»',
  },
  {
    pregunta: 'La foto de la cuenta de Google, ¿se ve?',
    resuelta: (raiz) => leer(raiz, 'src/lib/csp.ts').includes('googleusercontent'),
    evidencia: '`img-src` en `src/lib/csp.ts`',
    siSi: 'SÍ — la CSP la admite',
    siNo: 'NO, y es decisión suya: enseñarla obliga a abrir la CSP a `lh3.googleusercontent.com`',
  },
  {
    pregunta: 'El servicio de telemetría, ¿se despliega solo?',
    resuelta: (raiz) =>
      leer(raiz, '.github/workflows/ci.yml').includes('Desplegar el servicio de telemetría'),
    evidencia: '`.github/workflows/ci.yml`, paso «Desplegar el servicio de telemetría»',
    siSi:
      'SÍ, desde el 2026-08-24 (`e892dff`). El CI dispara `EASYPANEL_SERVICE_HOOK` cuando el push toca `python-service/`. ' +
      '**NO pedir un Deploy a mano.** Si el secreto faltara, el paso dejaría dos avisos en la ejecución',
    siNo: 'NO — hay que pulsar Deploy a mano en panel.dittochatbot.com',
  },
  {
    pregunta: 'Las cuentas, ¿están disponibles?',
    resuelta: (raiz) => existsSync(join(raiz, 'src/lib/auth.ts')),
    evidencia: '`src/lib/auth.ts` · `src/lib/cuentas/`',
    siSi: 'SÍ — Google y correo, con los favoritos sincronizados',
    siNo: 'NO',
  },
];

const CABECERA = `<!-- GENERADO POR \`npm run estado\`. NO SE EDITA A MANO. -->
<!-- Cambiarlo aquí no cambia nada: lo reescribe el script y una prueba lo compara. -->

# Estado de ApexData, leído del código

> **Este es el único documento que no puede quedarse viejo**, porque no lo
> escribe nadie: cada línea es una sonda sobre el repositorio, en
> \`scripts/estado.ts\`. Si el código cambia y esto no se regenera, la prueba
> \`tests/estado.test.ts\` falla y el CI se pone en rojo.
>
> \`MEJORAS-PENDIENTES.md\` dice **qué reportó el usuario**.
> \`PROGRESO_RELANZAMIENTO_2026.md\` dice **qué se hizo y por qué**.
> Este dice **cómo está el código ahora mismo**. Para saber si algo sigue
> pendiente, se mira este.
`;

export function construirEstado(raiz: string): string {
  const filas = SONDAS.map((sonda) => {
    const ok = sonda.resuelta(raiz);
    return `| ${sonda.pregunta} | ${ok ? sonda.siSi : sonda.siNo} | ${sonda.evidencia} |`;
  });

  return [
    CABECERA,
    '| Qué | Cómo está | Dónde se comprueba |',
    '|---|---|---|',
    ...filas,
    '',
    '## Al volver de la otra máquina',
    '',
    'Antes de opinar sobre qué falta, reconciliar lo que entró:',
    '',
    '```',
    'git log --format="%h|%ad|%s" --date=short --since="<último día que conozco>" \\',
    '  | grep -E "\\|(feat|fix|perf)"',
    '```',
    '',
    'y mapear **cada línea** a su punto. El mapa del 10 al 14 de septiembre está',
    'en `SIGUIENTE-SESION.md`; se amplía, no se rehace.',
    '',
  ].join('\n');
}

/** `npm run estado`: lo imprime y deja el fichero al día. */
function main() {
  const raiz = process.cwd();
  const texto = construirEstado(raiz);
  writeFileSync(join(raiz, 'ESTADO.md'), texto, 'utf8');
  process.stdout.write(texto);
}

// Solo al ejecutarlo, no al importarlo desde la prueba.
if (process.argv[1]?.endsWith('estado.ts')) main();
