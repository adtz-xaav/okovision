import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.synthesisConfig.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.synthesisConfig.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("synthesis config routes", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/synthesis-config")).status).toBe(401);
  });

  it("is admin-only", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    expect((await request(app).get("/api/synthesis-config").set("Cookie", cookie)).status).toBe(403);
  });

  it("returns unconfigured defaults before anything is saved", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app).get("/api/synthesis-config").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.outdoorTempSensorId).toBeNull();
    expect(res.body.referenceTempC).toBe(18);
  });

  it("lets an admin configure sensor roles and constants", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const outdoor = await prisma.sensor.create({ data: { key: "outdoor_temp", label: "Outdoor" } });

    const res = await request(app)
      .put("/api/synthesis-config")
      .set("Cookie", cookie)
      .send({
        outdoorTempSensorId: outdoor.id,
        pelletWeightPerMinuteGrams: 150,
        referenceTempC: 19,
        houseSurfaceM2: 120,
      });
    expect(res.status).toBe(200);
    expect(res.body.outdoorTempSensorId).toBe(outdoor.id);
    expect(res.body.referenceTempC).toBe(19);
  });
});
