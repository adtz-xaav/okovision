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
