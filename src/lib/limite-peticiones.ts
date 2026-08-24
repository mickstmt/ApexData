/**
 * Cuántas peticiones se le aceptan a cada quien, y cada cuánto.
 *
 * Es lo que faltaba para que los demás arreglos valgan de algo: casi todo lo
 * que encontró la auditoría del 2026-08-24 era explotable **porque nada impedía
 * repetirlo mil veces**. Una petición barata que cuesta cara del otro lado solo
 * es un problema cuando se puede lanzar en bucle.
 *
 * Vive aparte del middleware porque la decisión —¿pasa o no pasa?— es lo único
 * que de verdad puede equivocarse, y así se prueba sin levantar un servidor.
 *
 * ## Por qué un cubo de fichas y no una ventana fija
 *
 * Una ventana fija («60 por minuto») deja pasar 120 seguidas a caballo de dos
 * ventanas, que es justo la ráfaga que hace daño. El cubo se rellena de forma
 * continua: quien va despacio nunca lo nota, y quien va en bucle se queda sin
 * fichas y tiene que esperar a que goteen.
 */

export interface Presupuesto {
  /** Peticiones sostenidas por ventana. */
  peticiones: number;
  /** El tamaño de la ventana, en milisegundos. */
  ventanaMs: number;
  /** Cuántas se toleran de golpe. Una página que pide varias cosas a la vez es normal. */
  rafaga: number;
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

/**
 * Los presupuestos, del más estricto al más suelto.
 *
 * No son iguales porque las rutas no cuestan igual:
 *
 * - **Telemetría**: cada fallo de caché hace que el servicio descargue una
 *   sesión entera de la F1 —medido: 36 s la primera vez— y bloquea su único
 *   proceso mientras tanto. Veinte peticiones a sesiones distintas son doce
 *   minutos de telemetría caída, a coste cero para quien las lanza.
 * - **Suscripciones push**: es la única ruta pública que ESCRIBE en la base, y
 *   cada dirección distinta crea una fila. Un teléfono se suscribe una vez;
 *   cinco por hora ya es generoso.
 * - **El resto de la API**: consultas a la base, que comparte cinco conexiones
 *   con toda la web. Agotarlas no rompe una ruta: rompe la app entera.
 * - **`/api/health`**: exenta. La vigila el propio CI cada 30 s para confirmar
 *   el relevo, y EasyPanel la sondea sin parar; limitarla sería limitarnos.
 */
export const PRESUPUESTOS: Record<string, Presupuesto> = {
  telemetria: { peticiones: 20, ventanaMs: MINUTO, rafaga: 8 },
  escritura: { peticiones: 5, ventanaMs: HORA, rafaga: 3 },
  api: { peticiones: 60, ventanaMs: MINUTO, rafaga: 20 },
};

/**
 * Qué presupuesto le toca a una ruta, y con qué nombre. `null` = no se limita.
 *
 * El NOMBRE importa tanto como el presupuesto: cada clase lleva su propio cubo
 * por visitante. Con un solo cubo por dirección, quien machacara la telemetría
 * se quedaba también sin poder abrir la lista de pilotos —comprobado: la
 * primera petición normal tras la ráfaga salía cortada—, y las capacidades de
 * una clase pisaban las de la otra.
 */
export function presupuestoDe(ruta: string): { clase: string; presupuesto: Presupuesto } | null {
  if (ruta === '/api/health') return null;
  if (!ruta.startsWith('/api/')) return null;

  if (ruta.startsWith('/api/push')) {
    return { clase: 'escritura', presupuesto: PRESUPUESTOS.escritura };
  }

  if (
    ruta.startsWith('/api/laps/') ||
    ruta.startsWith('/api/telemetry/') ||
    ruta.startsWith('/api/telemetry-compare/') ||
    ruta.startsWith('/api/weather/') ||
    ruta.startsWith('/api/clasificacion/')
  ) {
    return { clase: 'telemetria', presupuesto: PRESUPUESTOS.telemetria };
  }

  return { clase: 'api', presupuesto: PRESUPUESTOS.api };
}

/**
 * De quién viene la petición.
 *
 * Detrás del proxy inverso del VPS, la dirección del socket es siempre la del
 * proxy: hay que leerla de las cabeceras. Y se toma **la última** entrada de
 * `x-forwarded-for`, no la primera: cada proxy AÑADE al final la dirección de
 * quien le habló, así que la primera la controla quien envía la petición —basta
 * con mandar `X-Forwarded-For: loquesea` para estrenar cubo en cada intento— y
 * la última la escribió nuestro propio proxy.
 */
export function quienPide(cabeceras: Headers): string {
  const real = cabeceras.get('x-real-ip')?.trim();
  if (real) return real;

  const reenviada = cabeceras.get('x-forwarded-for');
  if (reenviada) {
    const partes = reenviada
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) return partes[partes.length - 1];
  }

  // Sin cabeceras no se puede distinguir a nadie, así que todos comparten cubo.
  // Es más estricto de la cuenta, y ese es el lado correcto por el que fallar.
  return 'sin-identificar';
}

interface Cubo {
  fichas: number;
  ultimo: number;
}

/**
 * Cuántos cubos se guardan como mucho.
 *
 * Sin tope, quien varíe la dirección de origen llena la memoria del servidor:
 * el limitador se convertiría en el ataque. Al llegar al tope se tiran los
 * cubos llenos, que son los de quien lleva rato sin pedir nada y por tanto no
 * pierde nada al olvidarlos.
 */
const MAXIMO_CUBOS = 20_000;

export class Limitador {
  private cubos = new Map<string, Cubo>();

  /** ¿Pasa? Y si no, cuántos segundos hay que esperar. */
  consultar(
    clave: string,
    presupuesto: Presupuesto,
    ahora: number
  ): { permitida: boolean; esperarSegundos: number } {
    const porMs = presupuesto.peticiones / presupuesto.ventanaMs;
    const cubo = this.cubos.get(clave);

    if (!cubo) {
      this.podar(ahora, porMs, presupuesto.rafaga);
      this.cubos.set(clave, { fichas: presupuesto.rafaga - 1, ultimo: ahora });
      return { permitida: true, esperarSegundos: 0 };
    }

    // El goteo desde la última vez, que es lo que hace continuo el reparto.
    const caidas = Math.max(0, ahora - cubo.ultimo) * porMs;
    const fichas = Math.min(presupuesto.rafaga, cubo.fichas + caidas);
    cubo.ultimo = ahora;

    if (fichas < 1) {
      cubo.fichas = fichas;
      return { permitida: false, esperarSegundos: Math.ceil((1 - fichas) / porMs / 1000) };
    }

    cubo.fichas = fichas - 1;
    return { permitida: true, esperarSegundos: 0 };
  }

  private podar(ahora: number, porMs: number, rafaga: number) {
    if (this.cubos.size < MAXIMO_CUBOS) return;

    for (const [clave, cubo] of this.cubos) {
      const fichas = cubo.fichas + Math.max(0, ahora - cubo.ultimo) * porMs;
      if (fichas >= rafaga) this.cubos.delete(clave);
    }

    // Si aún así no cabe —todo el mundo activo a la vez—, se vacía entero: es
    // preferible perder la cuenta un momento a quedarse sin memoria.
    if (this.cubos.size >= MAXIMO_CUBOS) this.cubos.clear();
  }

  /** Solo para las pruebas. */
  get tamaño() {
    return this.cubos.size;
  }
}
