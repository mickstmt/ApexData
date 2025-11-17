/**
 * Test Page - Visualize API Data
 * Temporary page to view seeded database content
 */

import { prisma } from '@/lib/prisma';

export default async function TestPage() {
  // Fetch data from database
  const drivers = await prisma.driver.findMany({
    take: 10,
    orderBy: { givenName: 'asc' },
  });

  const constructors = await prisma.constructor.findMany({
    take: 10,
    orderBy: { name: 'asc' },
  });

  const circuits = await prisma.circuit.findMany({
    take: 10,
    orderBy: { name: 'asc' },
  });

  const seasons = await prisma.season.findMany({
    orderBy: { year: 'desc' },
  });

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-black">Apex</span>
          <span className="text-[#ccff00]">Data</span> - Test Page
        </h1>
        <p className="text-gray-600 mb-8">
          Visualización de datos cargados en la base de datos
        </p>

        {/* Seasons */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-[#ccff00]">📅 Temporadas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-[#ccff00] transition-colors"
              >
                <div className="text-3xl font-bold text-[#ccff00]">{season.year}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Drivers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-[#ccff00]">🏎️ Pilotos (Top 10)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-[#ccff00] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold">
                    {driver.givenName} {driver.familyName}
                  </div>
                  {driver.permanentNumber && (
                    <div className="text-2xl font-bold text-[#ccff00]">#{driver.permanentNumber}</div>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {driver.code && <div>Código: {driver.code}</div>}
                  <div>Nacionalidad: {driver.nationality}</div>
                  {driver.dateOfBirth && (
                    <div>
                      Nacimiento: {new Date(driver.dateOfBirth).toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Constructors */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-[#ccff00]">🏁 Constructores (Top 10)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {constructors.map((constructor) => (
              <div
                key={constructor.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-[#ccff00] transition-colors"
              >
                <div className="text-lg font-bold mb-2">{constructor.name}</div>
                <div className="text-sm text-gray-600">
                  Nacionalidad: {constructor.nationality}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Circuits */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-[#ccff00]">🏟️ Circuitos (Top 10)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {circuits.map((circuit) => (
              <div
                key={circuit.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-[#ccff00] transition-colors"
              >
                <div className="text-lg font-bold mb-2">{circuit.name}</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>📍 {circuit.location}, {circuit.country}</div>
                  {circuit.lat && circuit.lng && (
                    <div className="text-xs">
                      Coordenadas: {circuit.lat.toFixed(4)}, {circuit.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Summary */}
        <section className="bg-gray-50/50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-[#ccff00]">📊 Resumen</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-[#ccff00]">{drivers.length}</div>
              <div className="text-sm text-gray-600">Pilotos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#ccff00]">{constructors.length}</div>
              <div className="text-sm text-gray-600">Constructores</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#ccff00]">{circuits.length}</div>
              <div className="text-sm text-gray-600">Circuitos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#ccff00]">{seasons.length}</div>
              <div className="text-sm text-gray-600">Temporadas</div>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a href="/" className="text-[#ccff00] hover:underline">
            ← Volver al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
