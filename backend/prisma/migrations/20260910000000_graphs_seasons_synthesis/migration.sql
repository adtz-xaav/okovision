-- AlterTable
ALTER TABLE "SiloEvent" ADD COLUMN     "quantityKg" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "SynthesisConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "outdoorTempSensorId" TEXT,
    "augerRunSensorId" TEXT,
    "augerPauseSensorId" TEXT,
    "burnerCycleSensorId" TEXT,
    "pelletWeightPerMinuteGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referenceTempC" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "houseSurfaceM2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SynthesisConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySynthesis" (
    "day" TEXT NOT NULL,
    "tcExtMax" DOUBLE PRECISION,
    "tcExtMin" DOUBLE PRECISION,
    "consoKg" DOUBLE PRECISION,
    "dju" DOUBLE PRECISION,
    "nbCycle" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySynthesis_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE UNIQUE INDEX "SynthesisConfig_outdoorTempSensorId_key" ON "SynthesisConfig"("outdoorTempSensorId");

-- CreateIndex
CREATE UNIQUE INDEX "SynthesisConfig_augerRunSensorId_key" ON "SynthesisConfig"("augerRunSensorId");

-- CreateIndex
CREATE UNIQUE INDEX "SynthesisConfig_augerPauseSensorId_key" ON "SynthesisConfig"("augerPauseSensorId");

-- CreateIndex
CREATE UNIQUE INDEX "SynthesisConfig_burnerCycleSensorId_key" ON "SynthesisConfig"("burnerCycleSensorId");

-- AddForeignKey
ALTER TABLE "SynthesisConfig" ADD CONSTRAINT "SynthesisConfig_outdoorTempSensorId_fkey" FOREIGN KEY ("outdoorTempSensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SynthesisConfig" ADD CONSTRAINT "SynthesisConfig_augerRunSensorId_fkey" FOREIGN KEY ("augerRunSensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SynthesisConfig" ADD CONSTRAINT "SynthesisConfig_augerPauseSensorId_fkey" FOREIGN KEY ("augerPauseSensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SynthesisConfig" ADD CONSTRAINT "SynthesisConfig_burnerCycleSensorId_fkey" FOREIGN KEY ("burnerCycleSensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

