-- CreateTable
CREATE TABLE "driver_standings" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "positionText" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT NOT NULL,

    CONSTRAINT "driver_standings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_standings_year_idx" ON "driver_standings"("year");

-- CreateIndex
CREATE INDEX "driver_standings_driverId_idx" ON "driver_standings"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_standings_year_round_driverId_key" ON "driver_standings"("year", "round", "driverId");

-- AddForeignKey
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
