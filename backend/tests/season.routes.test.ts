import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("season routes", () => {
  it("requires authentication to list seasons", async () => {
    expect((await request(app).get("/api/seasons")).status).toBe(401);
  });

  it("lets an admin create, update, and delete a season", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");

    const create = await request(app)
      .post("/api/seasons")
      .set("Cookie", cookie)
      .send({ label: "2025-2026", startDate: "2025-10-01", endDate: "2026-04-30" });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const update = await request(app)
      .put(`/api/seasons/${id}`)
      .set("Cookie", cookie)
      .send({ label: "Winter 2025-2026", startDate: "2025-10-01", endDate: "2026-04-30" });
    expect(update.status).toBe(200);
    expect(update.body.label).toBe("Winter 2025-2026");

    const del = await request(app).delete(`/api/seasons/${id}`).set("Cookie", cookie);
    expect(del.status).toBe(204);
  });

  it("rejects a season whose end date is before its start date", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app)
      .post("/api/seasons")
      .set("Cookie", cookie)
      .send({ label: "Backwards", startDate: "2026-04-30", endDate: "2025-10-01" });
    expect(res.status).toBe(400);
  });

  it("forbids a viewer from creating a season but allows listing", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const create = await request(app)
      .post("/api/seasons")
      .set("Cookie", cookie)
      .send({ label: "X", startDate: "2025-10-01", endDate: "2026-04-30" });
    expect(create.status).toBe(403);
    expect((await request(app).get("/api/seasons").set("Cookie", cookie)).status).toBe(200);
  });
});
