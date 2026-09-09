import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.schedulerRun.deleteMany();
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await prisma.schedulerRun.deleteMany();
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("POST /api/scheduler/jobs/boiler-ingest/run", () => {
  it("reports 409 when no boiler connection is configured", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app).post("/api/scheduler/jobs/boiler-ingest/run").set("Cookie", cookie);
    expect(res.status).toBe(409);
  });

  it("runs the ingest job and records a SchedulerRun on success", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    await prisma.boilerConnection.create({ data: { id: "singleton", host: "192.168.1.50" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html></html>", { status: 200 })));

    const res = await request(app).post("/api/scheduler/jobs/boiler-ingest/run").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ datesConsidered: 0, readingsWritten: 0 });

    const runs = await request(app).get("/api/scheduler/runs").set("Cookie", cookie);
    expect(runs.body).toHaveLength(1);
    expect(runs.body[0]).toMatchObject({ job: "boiler-ingest", status: "SUCCESS" });
  });

  it("records a FAILED run when the boiler is unreachable", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    await prisma.boilerConnection.create({ data: { id: "singleton", host: "192.168.1.50" } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    const res = await request(app).post("/api/scheduler/jobs/boiler-ingest/run").set("Cookie", cookie);
    expect(res.status).toBe(500);

    const runs = await request(app).get("/api/scheduler/runs").set("Cookie", cookie);
    expect(runs.body[0]).toMatchObject({ job: "boiler-ingest", status: "FAILED" });
  });

  it("is forbidden for a viewer", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const res = await request(app).post("/api/scheduler/jobs/boiler-ingest/run").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});
