import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { computeDailySynthesis, runDailySynthesisForDates } from "../src/services/synthesis.service.js";

beforeEach(async () => {
  await prisma.dailySynthesis.deleteMany();
  await prisma.synthesisConfig.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
});

afterAll(async () => {
  await prisma.dailySynthesis.deleteMany();
  await prisma.synthesisConfig.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.$disconnect();
});

async function setUpSensors() {
  const outdoor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor" } });
  const augerRun = await prisma.sensor.create({ data: { key: "auger_run", label: "Auger run" } });
  const augerPause = await prisma.sensor.create({ data: { key: "auger_pause", label: "Auger pause" } });
  const burnerCycle = await prisma.sensor.create({ data: { key: "burner_cycle", label: "Burner cycle" } });
  await prisma.synthesisConfig.create({
    data: {
      id: "singleton",
      outdoorTempSensorId: outdoor.id,
      augerRunSensorId: augerRun.id,
      augerPauseSensorId: augerPause.id,
      burnerCycleSensorId: burnerCycle.id,
      pelletWeightPerMinuteGrams: 100,
      referenceTempC: 18,
    },
  });
  return { outdoor, augerRun, augerPause, burnerCycle };
}

describe("computeDailySynthesis", () => {
  it("returns every metric null when nothing is configured", async () => {
    const result = await computeDailySynthesis("2026-01-05");
    expect(result).toEqual({ day: "2026-01-05", tcExtMax: null, tcExtMin: null, consoKg: null, dju: null, nbCycle: null });
  });

  it("computes DJU, pellet consumption, and cycle count from mapped sensors", async () => {
    const { outdoor, augerRun, augerPause, burnerCycle } = await setUpSensors();
    const t1 = new Date("2026-01-05T10:00:00.000Z");
    const t2 = new Date("2026-01-05T11:00:00.000Z");

    await prisma.sensorReading.createMany({
      data: [
        { sensorId: outdoor.id, timestamp: t1, value: -2 },
        { sensorId: outdoor.id, timestamp: t2, value: 4 },
        // duty cycle 0.5 -> 0.5 * (100g/1000) = 0.05kg
        { sensorId: augerRun.id, timestamp: t1, value: 30 },
        { sensorId: augerPause.id, timestamp: t1, value: 30 },
        // duty cycle 1.0 -> 1.0 * 0.1kg = 0.1kg
        { sensorId: augerRun.id, timestamp: t2, value: 60 },
        { sensorId: augerPause.id, timestamp: t2, value: 0 },
        { sensorId: burnerCycle.id, timestamp: t1, value: 1 },
        { sensorId: burnerCycle.id, timestamp: t2, value: 1 },
      ],
    });

    const result = await computeDailySynthesis("2026-01-05");
    // avg(-2, 4) = 1, referenceTempC 18 -> dju = 17
    expect(result.tcExtMax).toBe(4);
    expect(result.tcExtMin).toBe(-2);
    expect(result.dju).toBe(17);
    expect(result.consoKg).toBe(0.15);
    expect(result.nbCycle).toBe(2);
  });

  it("clamps DJU to zero once the day's average is above the reference temperature", async () => {
    const { outdoor } = await setUpSensors();
    await prisma.sensorReading.createMany({
      data: [
        { sensorId: outdoor.id, timestamp: new Date("2026-06-05T10:00:00.000Z"), value: 22 },
        { sensorId: outdoor.id, timestamp: new Date("2026-06-05T11:00:00.000Z"), value: 26 },
      ],
    });
    const result = await computeDailySynthesis("2026-06-05");
    expect(result.dju).toBe(0);
  });
});

describe("runDailySynthesisForDates", () => {
  it("skips today and days without a full day of readings", async () => {
    const { outdoor } = await setUpSensors();
    await prisma.sensorReading.create({ data: { sensorId: outdoor.id, timestamp: new Date("2026-01-05T10:00:00.000Z"), value: 5 } });
    const todayStr = new Date().toISOString().slice(0, 10);

    const result = await runDailySynthesisForDates(["2026-01-05", todayStr]);
    expect(result.daysProcessed).toBe(0);
    expect(await prisma.dailySynthesis.findUnique({ where: { day: "2026-01-05" } })).toBeNull();
  });

  it("computes and saves synthesis for a fully-ingested past day", async () => {
    const { outdoor } = await setUpSensors();
    await prisma.sensorReading.createMany({
      data: [
        { sensorId: outdoor.id, timestamp: new Date("2026-01-05T10:00:00.000Z"), value: 5 },
        { sensorId: outdoor.id, timestamp: new Date("2026-01-05T23:59:00.000Z"), value: 2 },
      ],
    });

    const result = await runDailySynthesisForDates(["2026-01-05"]);
    expect(result.daysProcessed).toBe(1);
    const saved = await prisma.dailySynthesis.findUnique({ where: { day: "2026-01-05" } });
    expect(saved?.tcExtMax).toBe(5);
    expect(saved?.tcExtMin).toBe(2);
  });
});
