-- AlterTable
ALTER TABLE "Sensor" ADD COLUMN     "csvColumn" INTEGER;

-- CreateTable
CREATE TABLE "BoilerConnection" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "host" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoilerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_csvColumn_key" ON "Sensor"("csvColumn");

