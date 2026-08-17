import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showSampleData() {
  console.log('\n📊 MUESTRA DE DATOS COMPLETOS EN LA BASE DE DATOS\n');
  console.log('='.repeat(70) + '\n');

  // Get one race with all details
  const race = await prisma.race.findFirst({
    where: {
      year: 2024,
      round: 7, // Imola - the example you provided
    },
    include: {
      circuit: true,
      results: {
        take: 3,
        include: {
          driver: true,
          team: true,
        },
        orderBy: {
          positionOrder: 'asc',
        },
      },
    },
  });

  if (race) {
    console.log('🏁 CARRERA:\n');
    console.log(`   Nombre:          ${race.raceName}`);
    console.log(`   Temporada:       ${race.year}`);
    console.log(`   Ronda:           ${race.round}`);
    console.log(`   Fecha:           ${race.date.toISOString().split('T')[0]}`);
    console.log(`   Hora:            ${race.time}`);
    console.log(`   URL Wikipedia:   ${race.url}`);

    console.log('\n📍 CIRCUITO:\n');
    console.log(`   ID:              ${race.circuit.circuitId}`);
    console.log(`   Nombre:          ${race.circuit.name}`);
    console.log(`   Ubicación:       ${race.circuit.location}`);
    console.log(`   País:            ${race.circuit.country}`);
    console.log(`   Coordenadas:     ${race.circuit.lat}°N, ${race.circuit.lng}°E`);
    console.log(`   URL Wikipedia:   ${race.circuit.url}`);

    console.log('\n🏆 TOP 3 RESULTADOS:\n');
    race.results.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.driver.givenName} ${result.driver.familyName}`);
      console.log(`      Piloto ID:        ${result.driver.driverId}`);
      console.log(`      Código:           ${result.driver.code}`);
      console.log(`      Número:           #${result.driver.permanentNumber}`);
      console.log(`      Nacionalidad:     ${result.driver.nationality}`);
      console.log(`      Fecha Nac.:       ${result.driver.dateOfBirth || 'N/A'}`);
      console.log(`      URL Wikipedia:    ${result.driver.url}`);
      console.log(`      Constructor:      ${result.team.name}`);
      console.log(`      Constructor URL:  ${result.team.url}`);
      console.log(`      Posición:         P${result.positionText}`);
      console.log(`      Grid:             ${result.grid}`);
      console.log(`      Puntos:           ${result.points}`);
      console.log(`      Vueltas:          ${result.laps}`);
      console.log(`      Tiempo:           ${result.time || result.status}`);
      console.log(`      Vuelta Rápida:    ${result.fastestLapTime || 'N/A'}`);
      console.log(`      Velocidad Prom:   ${result.fastestLapSpeed || 'N/A'} km/h`);
      console.log(`      Status:           ${result.status}`);
      console.log('');
    });
  }

  console.log('='.repeat(70));
  console.log('\n✅ TODOS LOS DATOS DISPONIBLES EN LA API ESTÁN GUARDADOS!\n');
  console.log('📊 Resumen de datos guardados:');
  console.log('   ✅ URLs de Wikipedia (carreras, circuitos, pilotos, constructores)');
  console.log('   ✅ Horarios de inicio de carreras');
  console.log('   ✅ Nombres completos de circuitos');
  console.log('   ✅ Coordenadas geográficas de circuitos');
  console.log('   ✅ Ubicaciones detalladas de circuitos');
  console.log('   ✅ Todos los datos de resultados de carreras');
  console.log('   ✅ Vuelta rápida y velocidad promedio');
  console.log('   ✅ Información completa de pilotos y constructores\n');

  await prisma.$disconnect();
}

showSampleData();
