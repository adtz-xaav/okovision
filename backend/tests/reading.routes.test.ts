import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("GET /api/readings", () => {
  it("returns a sensor's readings ordered by time, optionally bounded by from/to", async () => {
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const sensor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor" } });
    await prisma.sensorReading.createMany({
      data: [
        { sensorId: sensor.id, timestamp: new Date("2026-09-09T00:00:00.000Z"), value: 10 },
        { sensorId: sensor.id, timestamp: new Date("2026-09-09T00:05:00.000Z"), value: 11 },
        { sensorId: sensor.id, timestamp: new Date("2026-09-10T00:00:00.000Z"), value: 20 },
      ],
    });

    const all = await request(app).get(`/api/readings?sensorId=${sensor.id}`).set("Cookie", cookie);
    expect(all.body).toHaveLength(3);
    expect(all.body[0].value).toBe(10);

    const bounded = await request(app)
      .get(`/api/readings?sensorId=${sensor.id}&from=2026-09-09T00:00:00.000Z&to=2026-09-09T23:59:59.000Z`)
      .set("Cookie", cookie);
    expect(bounded.body).toHaveLength(2);
  });

  it("rejects a request missing a valid sensorId", async () => {
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const res = await request(app).get("/api/readings?sensorId=not-a-uuid").set("Cookie", cookie);
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/readings?sensorId=00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(401);
  });
});
