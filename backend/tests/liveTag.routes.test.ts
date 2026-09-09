import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { encryptSecret } from "../src/lib/crypto.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.liveTag.deleteMany();
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await prisma.liveTag.deleteMany();
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

async function withConnection(host = "192.168.1.89") {
  await prisma.boilerConnection.create({
    data: { id: "singleton", host, username: "P0060B5_408AAE", encryptedPassword: encryptSecret("pellematiccompact") },
  });
}

describe("live tag CRUD", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/live-tags")).status).toBe(401);
  });

  it("lets an admin create, list, update, and delete a live tag", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");

    const create = await request(app)
      .post("/api/live-tags")
      .set("Cookie", cookie)
      .send({ key: "eco_mode", label: "Eco mode", tag: "CAPPL:LOCAL.oekomode", writable: true, divisor: 1 });
    expect(create.status).toBe(201);

    const list = await request(app).get("/api/live-tags").set("Cookie", cookie);
    expect(list.body).toHaveLength(1);

    const update = await request(app)
      .put(`/api/live-tags/${create.body.id}`)
      .set("Cookie", cookie)
      .send({ key: "eco_mode", label: "Eco mode (renamed)", tag: "CAPPL:LOCAL.oekomode", writable: true, divisor: 1 });
    expect(update.status).toBe(200);
    expect(update.body.label).toBe("Eco mode (renamed)");

    const del = await request(app).delete(`/api/live-tags/${create.body.id}`).set("Cookie", cookie);
    expect(del.status).toBe(204);
  });

  it("rejects a tag path that doesn't look like a real boiler tag", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app)
      .post("/api/live-tags")
      .set("Cookie", cookie)
      .send({ key: "bad", label: "Bad", tag: "not-a-real-tag", writable: false, divisor: 1 });
    expect(res.status).toBe(400);
  });

  it("forbids a viewer from creating a live tag but allows listing", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const create = await request(app)
      .post("/api/live-tags")
      .set("Cookie", cookie)
      .send({ key: "x", label: "X", tag: "CAPPL:LOCAL.oekomode", writable: false, divisor: 1 });
    expect(create.status).toBe(403);
    expect((await request(app).get("/api/live-tags").set("Cookie", cookie)).status).toBe(200);
  });
});

describe("GET /api/live-tags/values", () => {
  it("reports 409 when the live channel isn't configured", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app).get("/api/live-tags/values").set("Cookie", cookie);
    expect(res.status).toBe(409);
  });

  it("reads and scales live values from the boiler", async () => {
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    await withConnection();
    await prisma.liveTag.create({
      data: { key: "outdoor", label: "Outdoor", tag: "CAPPL:LOCAL.L_aussentemperatur_ist", writable: false, divisor: 10, unit: "°C" },
    });

    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("index.cgi")) {
        return new Response(null, { status: 303, headers: [["set-cookie", "pksession=1"]] });
      }
      return new Response(JSON.stringify([{ status: "OK", name: "CAPPL:LOCAL.L_aussentemperatur_ist", value: "94" }]), { status: 200 });
    }));

    const res = await request(app).get("/api/live-tags/values").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: expect.any(String), key: "outdoor", label: "Outdoor", tag: "CAPPL:LOCAL.L_aussentemperatur_ist", writable: false, unit: "°C", value: 9.4 },
    ]);
  });
});

describe("POST /api/live-tags/:id/set", () => {
  it("rejects writing to a tag that isn't marked writable", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    await withConnection();
    const liveTag = await prisma.liveTag.create({
      data: { key: "outdoor", label: "Outdoor", tag: "CAPPL:LOCAL.L_aussentemperatur_ist", writable: false, divisor: 10 },
    });

    const res = await request(app).post(`/api/live-tags/${liveTag.id}/set`).set("Cookie", cookie).send({ value: 20 });
    expect(res.status).toBe(400);
  });

  it("writes a scaled value to the boiler for a writable tag", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    await withConnection();
    const liveTag = await prisma.liveTag.create({
      data: { key: "eco_mode", label: "Eco mode", tag: "CAPPL:LOCAL.oekomode", writable: true, divisor: 1 },
    });

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("index.cgi")) {
        return new Response(null, { status: 303, headers: [["set-cookie", "pksession=1"]] });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await request(app).post(`/api/live-tags/${liveTag.id}/set`).set("Cookie", cookie).send({ value: 1 });
    expect(res.status).toBe(204);

    const setCall = fetchMock.mock.calls.find(([url]: [string]) => String(url).includes("action=set"));
    expect(JSON.parse(setCall![1].body)).toEqual({ "CAPPL:LOCAL.oekomode": "1" });
  });

  it("is forbidden for a viewer", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const liveTag = await prisma.liveTag.create({
      data: { key: "eco_mode", label: "Eco mode", tag: "CAPPL:LOCAL.oekomode", writable: true, divisor: 1 },
    });
    const res = await request(app).post(`/api/live-tags/${liveTag.id}/set`).set("Cookie", cookie).send({ value: 1 });
    expect(res.status).toBe(403);
  });
});
