import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.dailySynthesis.deleteMany();
  await prisma.season.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.dailySynthesis.deleteMany();
  await prisma.season.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("GET /api/synthesis", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/synthesis").query({ from: "2026-01-01", to: "2026-01-31" });
    expect(res.status).toBe(401);
  });

  it("returns daily rows within the requested range", async () => {
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    await prisma.dailySynthesis.createMany({
      data: [
        { day: "2026-01-05", tcExtMax: 4, tcExtMin: -2, consoKg: 10, dju: 12, nbCycle: 3 },
        { day: "2026-02-01", tcExtMax: 8, tcExtMin: 2, consoKg: 8, dju: 6, nbCycle: 2 },
      ],
    });
    const res = await request(app).get("/api/synthesis").query({ from: "2026-01-01", to: "2026-01-31" }).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].day).toBe("2026-01-05");
  });
});

describe("GET /api/synthesis/seasons/:id", () => {
  it("groups daily rows into a monthly breakdown for the season's date range", async () => {
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const season = await prisma.season.create({ data: { label: "2025-2026", startDate: new Date("2025-10-01"), endDate: new Date("2026-04-30") } });
    await prisma.dailySynthesis.createMany({
      data: [
        { day: "2025-12-01", tcExtMax: 4, tcExtMin: -2, consoKg: 10, dju: 12, nbCycle: 3 },
        { day: "2025-12-15", tcExtMax: 6, tcExtMin: 0, consoKg: 8, dju: 9, nbCycle: 2 },
        { day: "2026-01-05", tcExtMax: 2, tcExtMin: -5, consoKg: 12, dju: 15, nbCycle: 4 },
      ],
    });

    const res = await request(app).get(`/api/synthesis/seasons/${season.id}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.months).toHaveLength(2);
    const december = res.body.months.find((m: { month: string }) => m.month === "2025-12");
    expect(december.consoKg).toBe(18);
    expect(december.nbCycle).toBe(5);
    expect(december.tcExtMax).toBe(6);
    expect(december.tcExtMin).toBe(-2);
  });

  it("404s for an unknown season", async () => {
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const res = await request(app).get("/api/synthesis/seasons/00000000-0000-0000-0000-000000000000").set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/synthesis/run", () => {
  it("is admin-only", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const res = await request(app).post("/api/synthesis/run").set("Cookie", cookie).send({ from: "2026-01-01", to: "2026-01-05" });
    expect(res.status).toBe(403);
  });

  it("computes synthesis for every fully-ingested day in the range", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const outdoor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor" } });
    await prisma.sensorReading.createMany({
      data: [
        { sensorId: outdoor.id, timestamp: new Date("2026-01-05T10:00:00.000Z"), value: 5 },
        { sensorId: outdoor.id, timestamp: new Date("2026-01-05T23:59:00.000Z"), value: 2 },
      ],
    });

    const res = await request(app).post("/api/synthesis/run").set("Cookie", cookie).send({ from: "2026-01-05", to: "2026-01-05" });
    expect(res.status).toBe(200);
    expect(res.body.daysProcessed).toBe(1);
    expect(await prisma.dailySynthesis.findUnique({ where: { day: "2026-01-05" } })).not.toBeNull();
  });
});
