/**
 * Lo que OpenF1 devuelve, recortado a lo que ApexData usa.
 *
 * No están todos los campos a propósito: cada uno que se declara aquí es uno
 * que hay que mantener si la fuente cambia, y de los dieciocho endpoints solo
 * hacen falta tres.
 */

/** Los siete tipos de sesión de un fin de semana, tal como los nombra OpenF1. */
export type NombreDeSesion =
  | 'Practice 1'
  | 'Practice 2'
  | 'Practice 3'
  | 'Sprint Qualifying'
  | 'Sprint'
  | 'Qualifying'
  | 'Race';

export interface SesionOpenF1 {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_short_name: string;
  country_name: string;
  location: string;
  year: number;
  is_cancelled: boolean;
}

export interface ResultadoOpenF1 {
  position: number | null;
  driver_number: number;
  number_of_laps: number | null;
  points: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  /**
   * El tiempo, y su forma depende de la sesión.
   *
   * En carrera es la duración total en segundos. En práctica, la mejor vuelta.
   * En clasificación llega **un valor por segmento** —Q1, Q2, Q3— y hay que
   * quedarse con el último que no sea nulo: el del segmento más lejos al que
   * llegó ese piloto, que es el que ordena la parrilla.
   */
  duration: number | number[] | null;
  gap_to_leader: number | number[] | null;
  meeting_key: number;
  session_key: number;
}

export interface PilotoOpenF1 {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string | null;
  team_colour: string | null;
  headshot_url: string | null;
}

/**
 * Una fila de clasificación ya usable: el resultado con el piloto pegado.
 *
 * OpenF1 los sirve por separado —`session_result` solo trae el dorsal— y
 * juntarlos en cada sitio que los use sería repetir el mismo `Map` cuatro
 * veces.
 */
export interface FilaDeSesion {
  puesto: number | null;
  dorsal: number;
  nombre: string;
  codigo: string;
  equipo: string;
  color: string | null;
  /** Segundos: vuelta en práctica y clasificación, carrera entera en carrera. */
  tiempo: number | null;
  puntos: number | null;
  abandono: boolean;
  noSalio: boolean;
  descalificado: boolean;
  /**
   * No aparece en la clasificación de esta sesión.
   *
   * OpenF1 solo lista a quien participó, así que un piloto al que sigues puede
   * no estar: en la Práctica 1 de Monza, Verstappen le cedió el coche a un
   * novato. Se marca en vez de descartarlo porque «tu piloto no salió» es
   * información, y callarla deja el aviso hablando de otros como si nada.
   */
  ausente?: boolean;
}
