import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.siloEvent.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.siloEvent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("silo event routes", () => {
  it("requires authentication to list silo events", async () => {
    expect((await request(app).get("/api/silo-events")).status).toBe(401);
  });

  it("lets an admin create, update, and delete a silo event", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");

    const create = await request(app)
      .post("/api/silo-events")
      .set("Cookie", cookie)
      .send({ occurredAt: "2025-10-15", quantityKg: 3000, note: "Autumn delivery" });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const update = await request(app)
      .put(`/api/silo-events/${id}`)
      .set("Cookie", cookie)
      .send({ occurredAt: "2025-10-15", quantityKg: 3200, note: "Autumn delivery (corrected)" });
    expect(update.status).toBe(200);
    expect(update.body.quantityKg).toBe(3200);

    const del = await request(app).delete(`/api/silo-events/${id}`).set("Cookie", cookie);
    expect(del.status).toBe(204);
  });

  it("rejects a non-positive quantity", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app)
      .post("/api/silo-events")
      .set("Cookie", cookie)
      .send({ occurredAt: "2025-10-15", quantityKg: 0 });
    expect(res.status).toBe(400);
  });

  it("forbids a viewer from creating a silo event but allows listing", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const create = await request(app)
      .post("/api/silo-events")
      .set("Cookie", cookie)
      .send({ occurredAt: "2025-10-15", quantityKg: 500 });
    expect(create.status).toBe(403);
    expect((await request(app).get("/api/silo-events").set("Cookie", cookie)).status).toBe(200);
  });
});
