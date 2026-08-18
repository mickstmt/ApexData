import { AnalysisClient } from './AnalysisClient';
import { getTelemetryOptions } from './options';
import { isTelemetryServiceConfigured } from '@/services/fastf1/client';

// Los datos de esta página cambian como mucho una vez por carrera, así que
// una hora de caché evita ir a Virginia en cada visita sin que nadie note
// nunca un dato viejo.
export const revalidate = 3600;

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
