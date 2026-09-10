import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoilerClient } from "../src/boiler/BoilerClient.js";
import { prisma } from "../src/lib/prisma.js";
import { ingestDay, isDateFullyIngested, runBoilerIngest } from "../src/services/ingestion.service.js";

function fakeClient(overrides: Partial<BoilerClient> = {}): BoilerClient {
  return {
    listAvailableDates: vi.fn().mockResolvedValue([]),
    fetchDayCsv: vi.fn().mockResolvedValue(""),
    ...overrides,
  };
}

beforeEach(async () => {
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
});

afterAll(async () => {
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.$disconnect();
});

describe("ingestDay", () => {
  it("writes one reading per mapped sensor per CSV row, ignoring unmapped columns and sensors", async () => {
    const outdoor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor", csvColumn: 0 } });
    const boiler = await prisma.sensor.create({ data: { key: "boiler_temp", label: "Boiler", csvColumn: 1 } });
    await prisma.sensor.create({ data: { key: "unmapped", label: "Unmapped" } });

    const csv = ["09.09.2026;00:00:00;18,5;62,0;999", "09.09.2026;00:05:00;18,4;61,8;999"].join("\n");
    const client = fakeClient({ fetchDayCsv: vi.fn().mockResolvedValue(csv) });

    const result = await ingestDay(client, "2026-09-09");

    expect(result).toEqual({ date: "2026-09-09", rowsParsed: 2, readingsWritten: 4 });

    const outdoorReadings = await prisma.sensorReading.findMany({ where: { sensorId: outdoor.id }, orderBy: { timestamp: "asc" } });
    expect(outdoorReadings.map((r) => r.value)).toEqual([18.5, 18.4]);

    const boilerReadings = await prisma.sensorReading.findMany({ where: { sensorId: boiler.id } });
    expect(boilerReadings).toHaveLength(2);
  });

  it("applies the sensor's correction offset to each stored value", async () => {
    const sensor = await prisma.sensor.create({ data: { key: "corrected", label: "Corrected", csvColumn: 0, correction: 1.5 } });
    const client = fakeClient({ fetchDayCsv: vi.fn().mockResolvedValue("09.09.2026;00:00:00;20,0") });

    await ingestDay(client, "2026-09-09");

    const reading = await prisma.sensorReading.findFirstOrThrow({ where: { sensorId: sensor.id } });
    expect(reading.value).toBeCloseTo(21.5);
  });

  it("is idempotent: re-ingesting the same day writes no duplicate readings", async () => {
    await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor", csvColumn: 0 } });
    const client = fakeClient({ fetchDayCsv: vi.fn().mockResolvedValue("09.09.2026;00:00:00;18,5") });

    const first = await ingestDay(client, "2026-09-09");
    const second = await ingestDay(client, "2026-09-09");

    expect(first.readingsWritten).toBe(1);
    expect(second.readingsWritten).toBe(0);
    expect(await prisma.sensorReading.count()).toBe(1);
  });

  it("does nothing (and never fetches) when no sensor has a CSV mapping", async () => {
    const fetchDayCsv = vi.fn();
    const result = await ingestDay(fakeClient({ fetchDayCsv }), "2026-09-09");
    expect(result).toEqual({ date: "2026-09-09", rowsParsed: 0, readingsWritten: 0 });
    expect(fetchDayCsv).not.toHaveBeenCalled();
  });
});

describe("isDateFullyIngested", () => {
  it("is false until a reading exists at 23:59, then true", async () => {
    const sensor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor", csvColumn: 0 } });
    expect(await isDateFullyIngested("2026-09-09")).toBe(false);

    await prisma.sensorReading.create({
      data: { sensorId: sensor.id, timestamp: new Date("2026-09-09T23:59:00.000Z"), value: 10 },
    });
    expect(await isDateFullyIngested("2026-09-09")).toBe(true);
  });

  // Real hardware doesn't land its last log line exactly on the minute: Xavier's boiler
  // logs its last row of the day at 23:59:47. An exact-instant check missed this entirely
  // and silently left every real day "not fully ingested" forever.
  it("is true for a reading anywhere in the 23:59 minute, not just exactly :00", async () => {
    const sensor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor", csvColumn: 0 } });
    await prisma.sensorReading.create({
      data: { sensorId: sensor.id, timestamp: new Date("2026-09-09T23:59:47.000Z"), value: 10 },
    });
    expect(await isDateFullyIngested("2026-09-09")).toBe(true);
  });
});

describe("runBoilerIngest", () => {
  it("skips dates that are already fully ingested", async () => {
    const sensor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor", csvColumn: 0 } });
    await prisma.sensorReading.create({
      data: { sensorId: sensor.id, timestamp: new Date("2026-09-08T23:59:00.000Z"), value: 10 },
    });

    const fetchDayCsv = vi.fn().mockResolvedValue("09.09.2026;00:00:00;18,5");
    const client = fakeClient({
      listAvailableDates: vi.fn().mockResolvedValue(["2026-09-08", "2026-09-09"]),
      fetchDayCsv,
    });

    const result = await runBoilerIngest(client);

    expect(fetchDayCsv).toHaveBeenCalledTimes(1);
    expect(fetchDayCsv).toHaveBeenCalledWith("2026-09-09");
    expect(result).toEqual({ datesConsidered: 2, readingsWritten: 1 });
  });
});
