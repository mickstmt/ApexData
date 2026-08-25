/**
 * El estado de un piloto al final de la sesión, en corto y en español.
 *
 * ## Por qué existe esto
 *
 * La base guarda el estado como lo manda Jolpica: en inglés y sin abreviar.
 * En la fila de resultados se pintaba tal cual, así que en una app en español
 * salía «Collision damage» —dieciséis caracteres— en el hueco más estrecho de
 * la pantalla. Medido en un iPhone: al apellido le quedaban 99 px cuando
 * «Hülkenberg» necesita 89, y con «van der Garde» ya truncaba.
 *
 * Abreviar a **DNF, DNS y DSQ** libera 88 px. No es una concesión de espacio:
 * es como se escribe en la Fórmula 1, y quien mira resultados un domingo lo lee
 * antes que cualquier frase. El motivo completo no se pierde, se mueve al
 * detalle que se despliega al tocar la fila.
 *
 * Los 78 estados distintos que hay en la base están traducidos abajo. Uno que
 * no esté en la tabla se devuelve tal cual llegó: es preferible una palabra en
 * inglés a un hueco.
 */

/** Cómo se resume el estado en la fila. */
export type ClaseDeEstado = 'terminado' | 'vueltas' | 'dnf' | 'dns' | 'dsq';

export interface EstadoResumido {
  /** Lo que va en la fila: un tiempo, «+1 vuelta», DNF, DNS o DSQ. */
  corto: string;
  /** El motivo completo, en español, para el detalle. Nulo si no aporta nada. */
  motivo: string | null;
  clase: ClaseDeEstado;
}

/** No arrancó: la parrilla se quedó con un hueco. */
const NO_SALIO = new Set(['Did not start', 'Withdrew', 'Illness', 'Injury']);

/** Fuera por decisión de los comisarios, no por avería. */
const EXCLUIDO = new Set(['Disqualified', 'Excluded']);

/**
 * El motivo, en español.
 *
 * Sólo se ve en el detalle de la fila, así que aquí prima ser exacto sobre ser
 * corto. Los nombres siguen la forma en que se dicen en las retransmisiones en
 * español —«caja de cambios», no «transmisión»—, que es como los va a buscar
 * quien los lea.
 */
const MOTIVOS: Record<string, string> = {
  Accident: 'Accidente',
  Alternator: 'Alternador',
  Battery: 'Batería',
  'Brake duct': 'Conducto de freno',
  Brakes: 'Frenos',
  Clutch: 'Embrague',
  Collision: 'Colisión',
  'Collision damage': 'Daños por colisión',
  'Cooling system': 'Sistema de refrigeración',
  Damage: 'Daños',
  Debris: 'Restos en pista',
  'Did not start': 'No tomó la salida',
  Differential: 'Diferencial',
  Disqualified: 'Descalificado',
  Driveshaft: 'Palier',
  Drivetrain: 'Transmisión',
  ERS: 'Sistema de recuperación de energía',
  Electrical: 'Fallo eléctrico',
  Electronics: 'Electrónica',
  Engine: 'Motor',
  'Engine misfire': 'Fallo de encendido',
  Excluded: 'Excluido',
  Exhaust: 'Escape',
  'Front wing': 'Alerón delantero',
  'Fuel leak': 'Fuga de combustible',
  'Fuel pressure': 'Presión de combustible',
  'Fuel pump': 'Bomba de combustible',
  'Fuel system': 'Sistema de combustible',
  Gearbox: 'Caja de cambios',
  'Heat shield fire': 'Incendio del escudo térmico',
  Hydraulics: 'Hidráulica',
  Illness: 'Enfermedad',
  Injury: 'Lesión',
  Mechanical: 'Avería mecánica',
  'Oil leak': 'Fuga de aceite',
  'Oil pressure': 'Presión de aceite',
  'Out of fuel': 'Se quedó sin combustible',
  Overheating: 'Sobrecalentamiento',
  Pneumatics: 'Sistema neumático',
  'Power Unit': 'Unidad de potencia',
  'Power loss': 'Pérdida de potencia',
  Puncture: 'Pinchazo',
  Radiator: 'Radiador',
  'Rear wing': 'Alerón trasero',
  Retired: 'Abandono',
  Seat: 'Asiento',
  'Spark plugs': 'Bujías',
  'Spun off': 'Trompo',
  Steering: 'Dirección',
  Suspension: 'Suspensión',
  Technical: 'Problema técnico',
  Throttle: 'Acelerador',
  'Track rod': 'Barra de dirección',
  Transmission: 'Transmisión',
  Turbo: 'Turbo',
  Tyre: 'Neumático',
  Undertray: 'Fondo plano',
  Vibrations: 'Vibraciones',
  'Water leak': 'Fuga de agua',
  'Water pressure': 'Presión de agua',
  'Water pump': 'Bomba de agua',
  Wheel: 'Rueda',
  'Wheel nut': 'Tuerca de rueda',
  Withdrew: 'Se retiró del gran premio',
};

/** «+3 Laps» → 3. Nulo si el estado no es de los que van a vueltas. */
function vueltasDeMas(estado: string): number | null {
  const encaje = /^\+(\d+) Laps?$/.exec(estado);
  return encaje ? Number(encaje[1]) : null;
}

/**
 * Resume el estado de un resultado para pintarlo.
 *
 * `tiempo` manda cuando existe: quien termina en la vuelta del ganador se
 * identifica por su tiempo o por su intervalo, no por la palabra «Finished».
 */
export function resumirEstado(tiempo: string | null | undefined, estado: string): EstadoResumido {
  if (tiempo) {
    return { corto: tiempo, motivo: null, clase: 'terminado' };
  }

  const vueltas = vueltasDeMas(estado);
  if (vueltas !== null) {
    return {
      corto: vueltas === 1 ? '+1 vuelta' : `+${vueltas} vueltas`,
      motivo: null,
      clase: 'vueltas',
    };
  }

  // Terminó en la misma vuelta pero sin tiempo registrado: pasa en carreras
  // antiguas. No hay nada que abreviar ni que explicar.
  if (estado === 'Finished') {
    return { corto: 'Meta', motivo: null, clase: 'terminado' };
  }

  // Doblado y clasificado, sin decir cuántas vueltas. Es un final, no un
  // abandono, así que no puede salir como DNF.
  if (estado === 'Lapped') {
    return { corto: 'Doblado', motivo: null, clase: 'vueltas' };
  }

  const motivo = MOTIVOS[estado] ?? estado;

  if (NO_SALIO.has(estado)) return { corto: 'DNS', motivo, clase: 'dns' };
  if (EXCLUIDO.has(estado)) return { corto: 'DSQ', motivo, clase: 'dsq' };

  return { corto: 'DNF', motivo, clase: 'dnf' };
}

/**
 * Cómo se lee en voz alta, para quien no ve la pantalla.
 *
 * «DNF» en un lector de pantalla suena «de-ene-efe», que no dice nada. La fila
 * ya lleva su etiqueta accesible, y este texto la completa.
 */
export function estadoEnPalabras(resumen: EstadoResumido): string {
  const etiqueta =
    resumen.clase === 'dnf' ? 'Abandonó' : resumen.clase === 'dns' ? 'No tomó la salida' : 'Descalificado';

  if (resumen.clase === 'terminado' || resumen.clase === 'vueltas') return resumen.corto;
  if (!resumen.motivo) return etiqueta;

  // «No tomó la salida: no tomó la salida». Algunos motivos ya son la propia
  // etiqueta —el estado no aporta nada más que la clase—, y repetirlos suena a
  // error en un lector de pantalla.
  const motivo = resumen.motivo.toLowerCase();
  if (motivo === etiqueta.toLowerCase() || motivo === 'abandono') return etiqueta;

  return `${etiqueta}: ${motivo}`;
}
