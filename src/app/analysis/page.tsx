import { AnalysisClient } from './AnalysisClient';
import { getTelemetryOptions } from './options';
import { isTelemetryServiceConfigured } from '@/services/fastf1/client';
import type { SessionType } from '@/types';

/**
 * Las sesiones que se pueden pedir por enlace.
 *
 * Se valida contra esta lista y no se confía en la URL: un código inventado
 * llegaría hasta el servicio y volvería como un 400 que nadie sabe leer. Si no
 * encaja, la página abre como siempre.
 */
const SESIONES_ENLAZABLES: SessionType[] = ['FP1', 'FP2', 'FP3', 'SQ', 'S', 'Q', 'R'];

// La página es dinámica y quien cachea es la consulta (ver `options.ts`).
// Prerenderizarla obligaba a consultar la base durante el build, que es
// justo lo que el CI no tiene.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Telemetría | ApexData',
  description: 'Telemetría de vuelta, comparación entre pilotos y vueltas rápidas.',
};

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; ronda?: string; sesion?: string }>;
}) {
  const { sessions, drivers } = await getTelemetryOptions();
  const { anio, ronda, sesion } = await searchParams;

  const year = Number(anio);
  const round = Number(ronda);
  const preseleccion =
    Number.isInteger(year) && Number.isInteger(round) && SESIONES_ENLAZABLES.includes(sesion as SessionType)
      ? { year, round, sesion: sesion as SessionType }
      : null;

  return (
    <AnalysisClient
      sessions={sessions}
      drivers={drivers}
      serviceConfigured={isTelemetryServiceConfigured}
      preseleccion={preseleccion}
    />
  );
}
