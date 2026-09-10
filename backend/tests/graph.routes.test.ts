import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.graphSensor.deleteMany();
  await prisma.graph.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.graphSensor.deleteMany();
  await prisma.graph.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

async function createSensor(key: string, label: string) {
  return prisma.sensor.create({ data: { key, label, unit: "°C" } });
}

describe("graph routes", () => {
  it("requires authentication to list graphs", async () => {
    expect((await request(app).get("/api/graphs")).status).toBe(401);
  });

  it("lets an admin create a graph with sensors, then update and delete it", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const outdoor = await createSensor("outdoor_temp", "Outdoor temperature");
    const boiler = await createSensor("boiler_temp", "Boiler temperature");

    const create = await request(app)
      .post("/api/graphs")
      .set("Cookie", cookie)
      .send({
        name: "Temperatures",
        position: 0,
        sensors: [
          { sensorId: outdoor.id, coefficient: 1, position: 0 },
          { sensorId: boiler.id, coefficient: 1, position: 1 },
        ],
      });
    expect(create.status).toBe(201);
    expect(create.body.sensors).toHaveLength(2);
    const graphId = create.body.id;

    const update = await request(app)
      .put(`/api/graphs/${graphId}`)
      .set("Cookie", cookie)
      .send({ name: "Temperatures (renamed)", position: 0, sensors: [{ sensorId: outdoor.id, coefficient: 2, position: 0 }] });
    expect(update.status).toBe(200);
    expect(update.body.name).toBe("Temperatures (renamed)");
    expect(update.body.sensors).toHaveLength(1);
    expect(update.body.sensors[0].coefficient).toBe(2);

    const del = await request(app).delete(`/api/graphs/${graphId}`).set("Cookie", cookie);
    expect(del.status).toBe(204);
  });

  it("rejects a graph referencing a sensor that doesn't exist", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app)
      .post("/api/graphs")
      .set("Cookie", cookie)
      .send({ name: "Bad", position: 0, sensors: [{ sensorId: "00000000-0000-0000-0000-000000000000", coefficient: 1, position: 0 }] });
    expect(res.status).toBe(400);
  });

  it("forbids a viewer from creating a graph but allows listing", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const create = await request(app).post("/api/graphs").set("Cookie", cookie).send({ name: "X", position: 0, sensors: [] });
    expect(create.status).toBe(403);
    expect((await request(app).get("/api/graphs").set("Cookie", cookie)).status).toBe(200);
  });

  it("returns per-sensor readings scaled by coefficient for a date range", async () => {
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const outdoor = await createSensor("outdoor_temp", "Outdoor temperature");
    await prisma.sensorReading.createMany({
      data: [
        { sensorId: outdoor.id, timestamp: new Date("2026-01-01T10:00:00.000Z"), value: 5 },
        { sensorId: outdoor.id, timestamp: new Date("2026-01-01T11:00:00.000Z"), value: 6 },
      ],
    });
    const graph = await prisma.graph.create({
      data: { name: "Outdoor", sensors: { create: [{ sensorId: outdoor.id, coefficient: 2, position: 0 }] } },
    });

    const res = await request(app)
      .get(`/api/graphs/${graph.id}/data`)
      .query({ from: "2026-01-01T00:00:00.000Z", to: "2026-01-02T00:00:00.000Z" })
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.series).toHaveLength(1);
    expect(res.body.series[0].points.map((p: { value: number }) => p.value)).toEqual([10, 12]);
  });
});
