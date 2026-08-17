import { AnalysisClient } from './AnalysisClient';
import { getTelemetryOptions } from './options';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Telemetría | ApexData',
  description: 'Telemetría de vuelta, comparación entre pilotos y vueltas rápidas.',
};

export default async function AnalysisPage() {
  const { sessions, drivers } = await getTelemetryOptions();

  return <AnalysisClient sessions={sessions} drivers={drivers} />;
}
