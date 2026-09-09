import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const app = createApp();

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("registers the first user as admin and sets a session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", password: "correct-horse-battery" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: "owner@example.com", role: "ADMIN" });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/SameSite=Strict/i);
  });

  it("registers a second user as a viewer", async () => {
    await request(app).post("/api/auth/register").send({ email: "owner@example.com", password: "correct-horse-battery" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "guest@example.com", password: "another-long-password" });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("VIEWER");
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/api/auth/register").send({ email: "owner@example.com", password: "correct-horse-battery" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", password: "correct-horse-battery" });

    expect(res.status).toBe(409);
  });

  it("rejects a short password", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "short@example.com", password: "short" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login and GET /api/auth/me", () => {
  it("logs in with correct credentials and fetches the session user", async () => {
    await request(app).post("/api/auth/register").send({ email: "owner@example.com", password: "correct-horse-battery" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@example.com", password: "correct-horse-battery" });
    expect(loginRes.status).toBe(200);

    const cookie = loginRes.headers["set-cookie"];
    const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("owner@example.com");
  });

  it("rejects an incorrect password", async () => {
    await request(app).post("/api/auth/register").send({ email: "owner@example.com", password: "correct-horse-battery" });
    const res = await request(app).post("/api/auth/login").send({ email: "owner@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("rejects /me without a session cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/okovision_session=;/);
  });
});
