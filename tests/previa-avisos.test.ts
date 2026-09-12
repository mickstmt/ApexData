import { describe, expect, it } from 'vitest';

import {
  HORA_DE_LA_PREVIA,
  RETROVISOR_HORAS,
  diasDeCarrera,
  redactarPrevia,
  tocaLaPrevia,
} from '@/lib/push/previa';
import { LIMITE_CARACTERES } from '@/lib/push/redaccion';
import { diaAnterior, diaLocal, horaEnZona, instanteDe, zonaValida } from '@/lib/push/zona';
import type { SesionOpenF1 } from '@/services/openf1/tipos';

const LIMA = 'America/Lima';
const MADRID = 'Europe/Madrid';

function sesion(nombre: string, inicioISO: string, clave = 1): SesionOpenF1 {
  const inicio = new Date(inicioISO);

  return {
    session_key: clave,
    session_name: nombre,
    session_type: nombre,
    date_start: inicio.toISOString(),
    date_end: new Date(inicio.getTime() + 3600e3).toISOString(),
    meeting_key: 1,
    circuit_short_name: 'Madring',
    country_name: 'Spain',
    location: 'Madrid',
    year: 2026,
    is_cancelled: false,
  };
}

/** El GP de España 2026, con las horas que publica OpenF1. */
const MADRID_2026 = [
  sesion('Practice 1', '2026-09-11T11:30:00Z', 1),
  sesion('Practice 2', '2026-09-11T15:00:00Z', 2),
  sesion('Practice 3', '2026-09-12T10:30:00Z', 3),
  sesion('Qualifying', '2026-09-12T14:00:00Z', 4),
  sesion('Race', '2026-09-13T13:00:00Z', 5),
];

describe('husos horarios', () => {
  it('reconoce los que existen y rechaza los inventados', () => {
    expect(zonaValida(LIMA)).toBe(true);
    expect(zonaValida(MADRID)).toBe(true);
    expect(zonaValida('Marte/Olympus')).toBe(false);
  });

  it('sabe qué día es allí, que no siempre es el mismo que aquí', () => {
    // Las 02:00 UTC del 12 son todavía el 11 por la noche en Lima.
    const instante = new Date('2026-09-12T02:00:00Z');

    expect(diaLocal(instante, LIMA)).toEqual({ anio: 2026, mes: 9, dia: 11 });
    expect(diaLocal(instante, MADRID)).toEqual({ anio: 2026, mes: 9, dia: 12 });
  });

  it('construye el instante de una hora local', () => {
    // Lima no tiene horario de verano: siempre UTC-5.
    expect(instanteDe({ anio: 2026, mes: 9, dia: 10 }, 20, LIMA).toISOString()).toBe(
      '2026-09-11T01:00:00.000Z'
    );

    // Madrid en septiembre va en horario de verano: UTC+2.
    expect(instanteDe({ anio: 2026, mes: 9, dia: 10 }, 20, MADRID).toISOString()).toBe(
      '2026-09-10T18:00:00.000Z'
    );
  });

  it('acierta en la hora del salto, que es donde la cuenta ingenua falla', () => {
    // Madrid adelanta el reloj la madrugada del 29 de marzo de 2026: a las
    // 02:00 CET se pasa a las 03:00 CEST.
    //
    // Este caso es el que obliga a corregir la estimación. La primera cuenta
    // mira el desfase del instante equivocado —ya en horario de verano— y se
    // pasa una hora; la segunda, hecha sobre el resultado de la primera, lo
    // devuelve a su sitio. Comprobado quitando la corrección: esta prueba falla
    // y ninguna otra se entera.
    expect(instanteDe({ anio: 2026, mes: 3, dia: 29 }, 1, MADRID).toISOString()).toBe(
      '2026-03-29T00:00:00.000Z'
    );
  });

  it('acierta también la noche del cambio de hora', () => {
    // Madrid vuelve al horario de invierno la madrugada del 25 de octubre de
    // 2026. La tarde anterior sigue en UTC+2 y la siguiente ya en UTC+1: si la
    // cuenta no se corrigiera, una de las dos saldría con una hora de error.
    expect(instanteDe({ anio: 2026, mes: 10, dia: 24 }, 20, MADRID).toISOString()).toBe(
      '2026-10-24T18:00:00.000Z'
    );
    expect(instanteDe({ anio: 2026, mes: 10, dia: 25 }, 20, MADRID).toISOString()).toBe(
      '2026-10-25T19:00:00.000Z'
    );
  });

  it('retrocede un día sin tropezar con el fin de mes', () => {
    expect(diaAnterior({ anio: 2026, mes: 9, dia: 1 })).toEqual({ anio: 2026, mes: 8, dia: 31 });
    expect(diaAnterior({ anio: 2026, mes: 1, dia: 1 })).toEqual({ anio: 2025, mes: 12, dia: 31 });
    // Año bisiesto.
    expect(diaAnterior({ anio: 2028, mes: 3, dia: 1 })).toEqual({ anio: 2028, mes: 2, dia: 29 });
  });
});

describe('los días de un fin de semana', () => {
  it('agrupa por el día de quien lo ve, no por el del circuito', () => {
    const dias = diasDeCarrera(MADRID_2026, LIMA);

    expect(dias).toHaveLength(3);
    expect(dias[0].sesiones.map((s) => s.session_name)).toEqual(['Practice 1', 'Practice 2']);
    expect(dias[1].sesiones.map((s) => s.session_name)).toEqual(['Practice 3', 'Qualifying']);
    expect(dias[2].sesiones.map((s) => s.session_name)).toEqual(['Race']);
  });

  it('pone la previa a las 20:00 de la noche anterior', () => {
    const [viernes] = diasDeCarrera(MADRID_2026, LIMA);

    expect(horaEnZona(viernes.aviso, LIMA)).toBe(`${HORA_DE_LA_PREVIA}:00`);
    // La Práctica 1 es el viernes 11 a las 06:30 de Lima; la previa, el jueves.
    expect(diaLocal(viernes.aviso, LIMA)).toEqual({ anio: 2026, mes: 9, dia: 10 });
  });

  it('la misma carrera se agrupa distinto en otro huso', () => {
    // En Madrid las sesiones caen en tres días igual, pero a otras horas, y la
    // previa sale en otro instante: son las 20:00 de allí, no las de Lima.
    const enLima = diasDeCarrera(MADRID_2026, LIMA);
    const enMadrid = diasDeCarrera(MADRID_2026, MADRID);

    expect(enMadrid).toHaveLength(3);
    expect(enMadrid[0].aviso.toISOString()).not.toBe(enLima[0].aviso.toISOString());
    expect(horaEnZona(enMadrid[0].aviso, MADRID)).toBe('20:00');
  });

  /**
   * El caso que justifica agrupar por el huso de quien mira.
   *
   * Una carrera asiática de madrugada cae, en hora de Lima, el día anterior al
   * que marca el calendario del circuito. Agrupar por el día de allí pondría la
   * previa un día entero fuera de sitio.
   */
  it('una sesión de madrugada cuenta como el día que es aquí', () => {
    const shanghai = [
      sesion('Practice 1', '2026-03-13T03:30:00Z', 10),
      sesion('Sprint Qualifying', '2026-03-13T07:30:00Z', 11),
    ];

    // 03:30 UTC del 13 son las 22:30 del 12 en Lima; 07:30 UTC son las 02:30
    // del 13. O sea que allí son el mismo día y aquí son dos.
    const dias = diasDeCarrera(shanghai, LIMA);

    expect(dias).toHaveLength(2);
    expect(diasDeCarrera(shanghai, 'Asia/Shanghai')).toHaveLength(1);
  });
});

describe('cuándo se manda', () => {
  const [viernes] = diasDeCarrera(MADRID_2026, LIMA);

  it('no antes de las 20:00', () => {
    expect(tocaLaPrevia(viernes, new Date(viernes.aviso.getTime() - 60_000))).toBe(false);
  });

  it('sí a partir de las 20:00', () => {
    expect(tocaLaPrevia(viernes, viernes.aviso)).toBe(true);
  });

  /**
   * Un servidor que estuvo caído toda la noche no debe despertar anunciando una
   * práctica que ya está rodando. Es peor que no avisar: da información falsa.
   */
  it('ya no, si la sesión empezó', () => {
    const empezada = new Date(new Date(viernes.primera.date_start).getTime() + 60_000);
    expect(tocaLaPrevia(viernes, empezada)).toBe(false);
  });
});

describe('el texto de la previa', () => {
  it('dice que empieza el fin de semana solo el primer día', () => {
    const dias = diasDeCarrera(MADRID_2026, LIMA);

    const primera = redactarPrevia({
      dia: dias[0],
      granPremio: 'Spanish Grand Prix',
      empieza: true,
      zona: LIMA,
    });

    expect(primera.titulo).toBe('Spanish Grand Prix · mañana');
    expect(primera.cuerpo).toBe('Mañana empieza: Práctica 1 a las 06:30 y Práctica 2 a las 10:00.');

    const segunda = redactarPrevia({
      dia: dias[1],
      granPremio: 'Spanish Grand Prix',
      empieza: false,
      zona: LIMA,
    });

    expect(segunda.cuerpo).toBe('Mañana: Práctica 3 a las 05:30 y Clasificación a las 09:00.');
  });

  it('escribe las horas en el huso de quien lo recibe', () => {
    const [dia] = diasDeCarrera(MADRID_2026, MADRID);

    const previa = redactarPrevia({
      dia,
      granPremio: 'Spanish Grand Prix',
      empieza: true,
      zona: MADRID,
    });

    // Las mismas sesiones que en Lima salían a las 06:30 y 10:00.
    expect(previa.cuerpo).toBe('Mañana empieza: Práctica 1 a las 13:30 y Práctica 2 a las 17:00.');
  });

  it('la hora no se pega al número de la práctica', () => {
    // Lo reportó el usuario leyendo su propio aviso: «Práctica 3 05:30» pone
    // dos cifras seguidas separadas por un espacio y hay que pararse a decidir
    // dónde acaba una. Con «a las» el segundo número se lee como hora sola.
    const previa = redactarPrevia({
      dia: diasDeCarrera([sesion('Practice 3', '2026-09-12T10:30:00Z', 1)], LIMA)[0],
      granPremio: 'Spanish Grand Prix',
      empieza: false,
      zona: LIMA,
    });

    expect(previa.cuerpo).toContain('a las');
    expect(previa.cuerpo, 'el nombre y la hora vuelven a estar pegados').not.toMatch(
      /Práctica \d \d{2}:\d{2}/
    );
  });

  it('resume en vez de cortarse cuando el día trae muchas sesiones', () => {
    const cargado = [
      sesion('Practice 1', '2026-09-11T11:30:00Z', 20),
      sesion('Sprint Qualifying', '2026-09-11T13:00:00Z', 21),
      sesion('Sprint', '2026-09-11T15:00:00Z', 22),
      sesion('Qualifying', '2026-09-11T17:00:00Z', 23),
    ];

    const [dia] = diasDeCarrera(cargado, LIMA);
    const previa = redactarPrevia({
      dia,
      granPremio: 'Spanish Grand Prix',
      empieza: true,
      zona: LIMA,
    });

    expect(previa.cuerpo.length).toBeLessThanOrEqual(LIMITE_CARACTERES);
    expect(previa.cuerpo).toContain('4 sesiones');
    expect(previa.cuerpo).toContain('Práctica 1 a las 06:30');
  });

  it('ninguna previa del fin de semana se corta', () => {
    for (const zona of [LIMA, MADRID, 'Asia/Tokyo', 'Australia/Melbourne']) {
      for (const [i, dia] of diasDeCarrera(MADRID_2026, zona).entries()) {
        const previa = redactarPrevia({
          dia,
          granPremio: 'Spanish Grand Prix',
          empieza: i === 0,
          zona,
        });

        expect(previa.cuerpo.length, `${zona}: ${previa.cuerpo}`).toBeLessThanOrEqual(
          LIMITE_CARACTERES
        );
      }
    }
  });
});

/**
 * La previa repetida del viernes, reproducida.
 *
 * El jueves a las 20:00 llegó la previa buena, con las dos sesiones del
 * viernes. El viernes a las 08:01 llegó una segunda diciendo «Mañana empieza:
 * Práctica 2 10:00» — esa sesión era ese mismo día, dos horas después.
 *
 * No fue que la marca fallara: la marca lleva la clave de la PRIMERA sesión del
 * grupo, y el grupo cambió de primera cuando la FP1 dejó de estar en la lista
 * por haber empezado ya.
 */
describe('la previa repetida del viernes', () => {
  /** Jueves 10, 20:00 en Lima. */
  const JUEVES_20 = new Date('2026-09-11T01:00:00Z');
  /** Viernes 11, 08:01 en Lima: la FP1 ya rodó, la FP2 aún no. */
  const VIERNES_0801 = new Date('2026-09-11T13:01:00Z');

  /** El filtro que tenía el emisor: solo lo que todavía no ha empezado. */
  const soloLoQueViene = (ahora: Date) =>
    MADRID_2026.filter((s) => new Date(s.date_start) > ahora);

  /** El que tiene ahora, con retrovisor. */
  const conRetrovisor = (ahora: Date) =>
    MADRID_2026.filter(
      (s) => new Date(s.date_start) > new Date(ahora.getTime() - RETROVISOR_HORAS * 3600e3)
    );

  it('el jueves sale UNA previa, con las dos sesiones del viernes', () => {
    const [viernes] = diasDeCarrera(conRetrovisor(JUEVES_20), LIMA);

    expect(tocaLaPrevia(viernes, JUEVES_20)).toBe(true);
    expect(viernes.sesiones.map((s) => s.session_name)).toEqual(['Practice 1', 'Practice 2']);
    // La marca se guarda con esta clave.
    expect(viernes.primera.session_key).toBe(1);
  });

  it('mirando solo hacia delante, el grupo cambia de identidad y vuelve a tocar', () => {
    // El fallo, tal cual: con la FP1 ya rodando queda un grupo que solo tiene
    // la FP2, con OTRA primera y por tanto otra clave. La marca del jueves no
    // lo tapa, y `tocaLaPrevia` sigue diciendo que sí.
    const [viernes] = diasDeCarrera(soloLoQueViene(VIERNES_0801), LIMA);

    expect(viernes.sesiones.map((s) => s.session_name)).toEqual(['Practice 2']);
    expect(viernes.primera.session_key).toBe(2);
    expect(tocaLaPrevia(viernes, VIERNES_0801)).toBe(true);
  });

  it('con retrovisor el grupo se mantiene entero, y ya no toca', () => {
    const [viernes] = diasDeCarrera(conRetrovisor(VIERNES_0801), LIMA);

    expect(viernes.sesiones.map((s) => s.session_name)).toEqual(['Practice 1', 'Practice 2']);
    expect(viernes.primera.session_key).toBe(1);
    // Su primera sesión ya rodó, así que se descarta solo.
    expect(tocaLaPrevia(viernes, VIERNES_0801)).toBe(false);
  });

  it('mirar atrás no resucita previas viejas', () => {
    // El domingo por la mañana, el retrovisor todavía alcanza a las sesiones
    // del sábado. Ninguna puede volver a mandarse: `tocaLaPrevia` exige que la
    // primera del grupo no haya empezado.
    const domingo = new Date('2026-09-13T12:00:00Z');
    const dias = diasDeCarrera(conRetrovisor(domingo), LIMA);
    const pasados = dias.filter((d) => new Date(d.primera.date_start) < domingo);

    expect(pasados.length).toBeGreaterThan(0);
    for (const dia of pasados) expect(tocaLaPrevia(dia, domingo)).toBe(false);
  });
});
