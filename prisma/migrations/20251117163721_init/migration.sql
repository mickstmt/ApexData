-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "permanentNumber" INTEGER,
    "code" TEXT,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constructors" (
    "id" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "url" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuits" (
    "id" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "alt" INTEGER,
    "url" TEXT,
    "length" DOUBLE PRECISION,
    "corners" INTEGER,
    "drsZones" INTEGER,
    "lapRecord" TEXT,
    "lapRecordYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL,
    "raceId" TEXT,
    "year" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "raceName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "fp1Date" TIMESTAMP(3),
    "fp1Time" TEXT,
    "fp2Date" TIMESTAMP(3),
    "fp2Time" TEXT,
    "fp3Date" TIMESTAMP(3),
    "fp3Time" TEXT,
    "qualiDate" TIMESTAMP(3),
    "qualiTime" TEXT,
    "sprintDate" TIMESTAMP(3),
    "sprintTime" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "circuitId" TEXT NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "position" INTEGER,
    "positionText" TEXT NOT NULL,
    "positionOrder" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grid" INTEGER NOT NULL,
    "laps" INTEGER NOT NULL,
    "time" TEXT,
    "milliseconds" BIGINT,
    "fastestLap" INTEGER,
    "rank" INTEGER,
    "fastestLapTime" TEXT,
    "fastestLapSpeed" TEXT,
    "statusId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "raceId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualifying" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "q1" TEXT,
    "q2" TEXT,
    "q3" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "raceId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL,

    CONSTRAINT "qualifying_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_results" (
    "id" TEXT NOT NULL,
    "position" INTEGER,
    "positionText" TEXT NOT NULL,
    "positionOrder" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grid" INTEGER NOT NULL,
    "laps" INTEGER NOT NULL,
    "time" TEXT,
    "milliseconds" BIGINT,
    "fastestLap" INTEGER,
    "fastestLapTime" TEXT,
    "statusId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "raceId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL,

    CONSTRAINT "sprint_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constructor_standings" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "positionText" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "constructorId" TEXT NOT NULL,

    CONSTRAINT "constructor_standings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driverId_key" ON "drivers"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_permanentNumber_key" ON "drivers"("permanentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_code_key" ON "drivers"("code");

-- CreateIndex
CREATE INDEX "drivers_driverId_idx" ON "drivers"("driverId");

-- CreateIndex
CREATE INDEX "drivers_nationality_idx" ON "drivers"("nationality");

-- CreateIndex
CREATE INDEX "drivers_permanentNumber_idx" ON "drivers"("permanentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "constructors_constructorId_key" ON "constructors"("constructorId");

-- CreateIndex
CREATE INDEX "constructors_constructorId_idx" ON "constructors"("constructorId");

-- CreateIndex
CREATE INDEX "constructors_nationality_idx" ON "constructors"("nationality");

-- CreateIndex
CREATE UNIQUE INDEX "circuits_circuitId_key" ON "circuits"("circuitId");

-- CreateIndex
CREATE INDEX "circuits_circuitId_idx" ON "circuits"("circuitId");

-- CreateIndex
CREATE INDEX "circuits_country_idx" ON "circuits"("country");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_year_key" ON "seasons"("year");

-- CreateIndex
CREATE INDEX "seasons_year_idx" ON "seasons"("year");

-- CreateIndex
CREATE INDEX "races_year_idx" ON "races"("year");

-- CreateIndex
CREATE INDEX "races_circuitId_idx" ON "races"("circuitId");

-- CreateIndex
CREATE INDEX "races_date_idx" ON "races"("date");

-- CreateIndex
CREATE UNIQUE INDEX "races_year_round_key" ON "races"("year", "round");

-- CreateIndex
CREATE INDEX "results_raceId_idx" ON "results"("raceId");

-- CreateIndex
CREATE INDEX "results_driverId_idx" ON "results"("driverId");

-- CreateIndex
CREATE INDEX "results_constructorId_idx" ON "results"("constructorId");

-- CreateIndex
CREATE INDEX "results_position_idx" ON "results"("position");

-- CreateIndex
CREATE UNIQUE INDEX "results_raceId_driverId_key" ON "results"("raceId", "driverId");

-- CreateIndex
CREATE INDEX "qualifying_raceId_idx" ON "qualifying"("raceId");

-- CreateIndex
CREATE INDEX "qualifying_driverId_idx" ON "qualifying"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "qualifying_raceId_driverId_key" ON "qualifying"("raceId", "driverId");

-- CreateIndex
CREATE INDEX "sprint_results_raceId_idx" ON "sprint_results"("raceId");

-- CreateIndex
CREATE INDEX "sprint_results_driverId_idx" ON "sprint_results"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "sprint_results_raceId_driverId_key" ON "sprint_results"("raceId", "driverId");

-- CreateIndex
CREATE INDEX "constructor_standings_year_idx" ON "constructor_standings"("year");

-- CreateIndex
CREATE INDEX "constructor_standings_constructorId_idx" ON "constructor_standings"("constructorId");

-- CreateIndex
CREATE UNIQUE INDEX "constructor_standings_year_round_constructorId_key" ON "constructor_standings"("year", "round", "constructorId");

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_year_fkey" FOREIGN KEY ("year") REFERENCES "seasons"("year") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "circuits"("circuitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifying" ADD CONSTRAINT "qualifying_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifying" ADD CONSTRAINT "qualifying_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifying" ADD CONSTRAINT "qualifying_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_results" ADD CONSTRAINT "sprint_results_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_results" ADD CONSTRAINT "sprint_results_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_results" ADD CONSTRAINT "sprint_results_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
