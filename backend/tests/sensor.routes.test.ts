import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("sensor routes", () => {
  it("requires authentication to list sensors", async () => {
    const res = await request(app).get("/api/sensors");
    expect(res.status).toBe(401);
  });

  it("lets an admin create, update, and delete a sensor", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");

    const createRes = await request(app)
      .post("/api/sensors")
      .set("Cookie", cookie)
      .send({ key: "outdoor_temp", label: "Outdoor temperature", unit: "°C", csvColumn: 0 });
    expect(createRes.status).toBe(201);
    const sensorId = createRes.body.id;

    const updateRes = await request(app)
      .put(`/api/sensors/${sensorId}`)
      .set("Cookie", cookie)
      .send({ key: "outdoor_temp", label: "Outdoor Temperature", unit: "°C", csvColumn: 0, correction: 0.5 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.correction).toBe(0.5);

    const listRes = await request(app).get("/api/sensors").set("Cookie", cookie);
    expect(listRes.body).toHaveLength(1);

    const deleteRes = await request(app).delete(`/api/sensors/${sensorId}`).set("Cookie", cookie);
    expect(deleteRes.status).toBe(204);
  });

  it("rejects a duplicate CSV column mapping", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    await request(app).post("/api/sensors").set("Cookie", cookie).send({ key: "a", label: "A", csvColumn: 0 });
    const res = await request(app).post("/api/sensors").set("Cookie", cookie).send({ key: "b", label: "B", csvColumn: 0 });
    expect(res.status).toBe(409);
  });

  it("forbids a viewer from creating a sensor but allows listing", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");

    const createRes = await request(app).post("/api/sensors").set("Cookie", cookie).send({ key: "x", label: "X" });
    expect(createRes.status).toBe(403);

    const listRes = await request(app).get("/api/sensors").set("Cookie", cookie);
    expect(listRes.status).toBe(200);
  });
});

describe("POST /api/sensors/import-from-boiler", () => {
  it("reports 409 when no boiler connection is configured", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app).post("/api/sensors/import-from-boiler").set("Cookie", cookie);
    expect(res.status).toBe(409);
  });

  it("bulk-creates sensors from the boiler's titles.csv, skipping already-mapped columns", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    await prisma.boilerConnection.create({ data: { id: "singleton", host: "192.168.1.50" } });
    await prisma.sensor.create({ data: { key: "custom_outdoor", label: "My outdoor sensor", csvColumn: 0 } });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("0;T extérieure\n1;Temp. ext. instantanée\n", { status: 200 })),
    );

    const res = await request(app).post("/api/sensors/import-from-boiler").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ created: 1, skipped: 1 });

    const sensors = await prisma.sensor.findMany({ orderBy: { csvColumn: "asc" } });
    expect(sensors).toHaveLength(2);
    expect(sensors[1]).toMatchObject({ key: "csv_1", label: "Temp. ext. instantanée", csvColumn: 1 });
  });

  it("is forbidden for a viewer", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const res = await request(app).post("/api/sensors/import-from-boiler").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});
