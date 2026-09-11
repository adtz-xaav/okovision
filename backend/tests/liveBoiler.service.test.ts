import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoilerClient } from "../src/boiler/BoilerClient.js";
import { encryptSecret } from "../src/lib/crypto.js";
import { prisma } from "../src/lib/prisma.js";
import { getBoilerCredentials, readLiveValues, writeLiveValue } from "../src/services/liveBoiler.service.js";

function fakeClient(overrides: Partial<BoilerClient> = {}): BoilerClient {
  return {
    listAvailableDates: vi.fn(),
    fetchDayCsv: vi.fn(),
    fetchColumnTitles: vi.fn(),
    getLiveValues: vi.fn().mockResolvedValue({}),
    setLiveValues: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const credentials = { host: "192.168.1.89", username: "P0060B5_408AAE", password: "pellematiccompact" };

beforeEach(async () => {
  await prisma.liveTag.deleteMany();
  await prisma.boilerConnection.deleteMany();
});

afterAll(async () => {
  await prisma.liveTag.deleteMany();
  await prisma.boilerConnection.deleteMany();
  await prisma.$disconnect();
});

describe("getBoilerCredentials", () => {
  it("returns null when no boiler connection exists", async () => {
    expect(await getBoilerCredentials()).toBeNull();
  });

  it("returns null when a connection exists but has no live credentials", async () => {
    await prisma.boilerConnection.create({ data: { id: "singleton", host: "192.168.1.89" } });
    expect(await getBoilerCredentials()).toBeNull();
  });

  it("decrypts the stored password", async () => {
    await prisma.boilerConnection.create({
      data: { id: "singleton", host: "192.168.1.89", username: "admin", encryptedPassword: encryptSecret("secret") },
    });
    expect(await getBoilerCredentials()).toEqual({ host: "192.168.1.89", username: "admin", password: "secret" });
  });
});

describe("readLiveValues", () => {
  it("scales each raw value by its divisor and passes through unit/writable", async () => {
    const liveTags = [
      { id: "1", key: "outdoor", label: "Outdoor", tag: "CAPPL:LOCAL.L_aussentemperatur_ist", writable: false, unit: "°C", divisor: 10 },
      { id: "2", key: "eco", label: "Eco mode", tag: "CAPPL:LOCAL.oekomode", writable: true, unit: null, divisor: 1 },
    ];
    const client = fakeClient({
      getLiveValues: vi.fn().mockResolvedValue({ "CAPPL:LOCAL.L_aussentemperatur_ist": "94", "CAPPL:LOCAL.oekomode": "1" }),
    });

    const readings = await readLiveValues(client, credentials, liveTags);

    expect(readings).toEqual([
      { id: "1", key: "outdoor", label: "Outdoor", tag: "CAPPL:LOCAL.L_aussentemperatur_ist", writable: false, unit: "°C", value: 9.4 },
      { id: "2", key: "eco", label: "Eco mode", tag: "CAPPL:LOCAL.oekomode", writable: true, unit: null, value: 1 },
    ]);
    expect(client.getLiveValues).toHaveBeenCalledWith("P0060B5_408AAE", "pellematiccompact", [
      "CAPPL:LOCAL.L_aussentemperatur_ist",
      "CAPPL:LOCAL.oekomode",
    ]);
  });

  it("reports null for a tag the boiler didn't return", async () => {
    const liveTags = [{ id: "1", key: "missing", label: "Missing", tag: "CAPPL:LOCAL.nonexistent", writable: false, unit: null, divisor: 1 }];
    const readings = await readLiveValues(fakeClient(), credentials, liveTags);
    expect(readings[0].value).toBeNull();
  });

  it("returns an empty array without calling the boiler when no live tags are configured", async () => {
    const client = fakeClient();
    const readings = await readLiveValues(client, credentials, []);
    expect(readings).toEqual([]);
    expect(client.getLiveValues).not.toHaveBeenCalled();
  });
});

describe("writeLiveValue", () => {
  it("multiplies the display value by the divisor before sending it to the boiler", async () => {
    const client = fakeClient();
    await writeLiveValue(client, credentials, { tag: "CAPPL:LOCAL.L_weather_hysteresis", divisor: 10 }, 2.5);
    expect(client.setLiveValues).toHaveBeenCalledWith("P0060B5_408AAE", "pellematiccompact", {
      "CAPPL:LOCAL.L_weather_hysteresis": "25",
    });
  });

  it("rounds to the nearest whole raw unit", async () => {
    const client = fakeClient();
    await writeLiveValue(client, credentials, { tag: "CAPPL:LOCAL.oekomode", divisor: 1 }, 1.4);
    expect(client.setLiveValues).toHaveBeenCalledWith("P0060B5_408AAE", "pellematiccompact", { "CAPPL:LOCAL.oekomode": "1" });
  });
});
