import { AnalysisClient } from './AnalysisClient';
import { getTelemetryOptions } from './options';
import { isTelemetryServiceConfigured } from '@/services/fastf1/client';

// La página es dinámica y quien cachea es la consulta (ver `options.ts`).
// Prerenderizarla obligaba a consultar la base durante el build, que es
// justo lo que el CI no tiene.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Telemetría | ApexData',
  description: 'Telemetría de vuelta, comparación entre pilotos y vueltas rápidas.',
};

export default async function AnalysisPage() {
  const { sessions, drivers } = await getTelemetryOptions();

  return (
    <AnalysisClient
      sessions={sessions}
      drivers={drivers}
      serviceConfigured={isTelemetryServiceConfigured}
    />
  );
}
