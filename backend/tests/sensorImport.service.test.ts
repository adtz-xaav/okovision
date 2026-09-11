import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoilerClient } from "../src/boiler/BoilerClient.js";
import { prisma } from "../src/lib/prisma.js";
import { importSensorsFromBoiler } from "../src/services/sensorImport.service.js";

function fakeClient(titles: string[]): BoilerClient {
  return {
    listAvailableDates: vi.fn(),
    fetchDayCsv: vi.fn(),
    fetchColumnTitles: vi.fn().mockResolvedValue(titles),
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

describe("importSensorsFromBoiler", () => {
  it("creates one sensor per titled column, keyed and mapped by index", async () => {
    const result = await importSensorsFromBoiler(fakeClient(["Outdoor temp", "Boiler temp"]));

    expect(result).toEqual({ created: 2, skipped: 0 });
    const sensors = await prisma.sensor.findMany({ orderBy: { csvColumn: "asc" } });
    expect(sensors).toMatchObject([
      { key: "csv_0", label: "Outdoor temp", csvColumn: 0 },
      { key: "csv_1", label: "Boiler temp", csvColumn: 1 },
    ]);
  });

  it("skips columns that already have a sensor mapped, without touching them", async () => {
    const existing = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Custom label", csvColumn: 0 } });

    const result = await importSensorsFromBoiler(fakeClient(["Outdoor temp", "Boiler temp"]));

    expect(result).toEqual({ created: 1, skipped: 1 });
    const unchanged = await prisma.sensor.findUniqueOrThrow({ where: { id: existing.id } });
    expect(unchanged.label).toBe("Custom label");
  });

  it("skips a duplicate label at a different index without erroring (real titles.csv has repeats)", async () => {
    const result = await importSensorsFromBoiler(fakeClient(["PE1 Allumeur", "PE1 Pompe", "PE1 Allumeur"]));
    // Both "PE1 Allumeur" entries import fine since the key is derived from the column
    // index (csv_0, csv_2), not the label — only a genuine key collision would skip.
    expect(result).toEqual({ created: 3, skipped: 0 });
  });

  it("skips blank titles (sparse or empty entries)", async () => {
    const titles: string[] = [];
    titles[0] = "Outdoor temp";
    titles[2] = "";
    titles[3] = "Boiler temp";

    const result = await importSensorsFromBoiler(fakeClient(titles));

    expect(result).toEqual({ created: 2, skipped: 2 });
    expect(await prisma.sensor.count()).toBe(2);
  });
});
