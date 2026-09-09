import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerAndLogin } from "./helpers/auth.js";

const app = createApp();

beforeEach(async () => {
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.boilerConnection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("boiler connection routes", () => {
  it("reports unconfigured until an admin sets a host", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");

    const before = await request(app).get("/api/boiler-connection").set("Cookie", cookie);
    expect(before.body).toEqual({ configured: false });

    const put = await request(app).put("/api/boiler-connection").set("Cookie", cookie).send({ host: "192.168.1.50" });
    expect(put.status).toBe(200);
    expect(put.body.host).toBe("192.168.1.50");

    const after = await request(app).get("/api/boiler-connection").set("Cookie", cookie);
    expect(after.body.host).toBe("192.168.1.50");
  });

  it("rejects a host with invalid characters", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app).put("/api/boiler-connection").set("Cookie", cookie).send({ host: "http://evil; rm -rf" });
    expect(res.status).toBe(400);
  });

  it("is forbidden for a viewer", async () => {
    await registerAndLogin(app, "admin@example.com");
    const { cookie } = await registerAndLogin(app, "viewer@example.com");
    const res = await request(app).get("/api/boiler-connection").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("stores live-channel credentials without ever returning the password", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");

    const put = await request(app)
      .put("/api/boiler-connection")
      .set("Cookie", cookie)
      .send({ host: "192.168.1.89", username: "P0060B5_408AAE", password: "pellematiccompact" });

    expect(put.status).toBe(200);
    expect(put.body).toEqual({ configured: true, host: "192.168.1.89", username: "P0060B5_408AAE", hasCredentials: true });

    const stored = await prisma.boilerConnection.findUniqueOrThrow({ where: { id: "singleton" } });
    expect(stored.encryptedPassword).not.toBe("pellematiccompact");
    expect(stored.encryptedPassword).not.toBeNull();
  });

  it("rejects a username without a password", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    const res = await request(app).put("/api/boiler-connection").set("Cookie", cookie).send({ host: "192.168.1.89", username: "admin" });
    expect(res.status).toBe(400);
  });

  it("leaves existing credentials untouched when updating just the host", async () => {
    const { cookie } = await registerAndLogin(app, "admin@example.com");
    await request(app)
      .put("/api/boiler-connection")
      .set("Cookie", cookie)
      .send({ host: "192.168.1.89", username: "admin", password: "secret" });

    const res = await request(app).put("/api/boiler-connection").set("Cookie", cookie).send({ host: "192.168.1.90" });

    expect(res.body).toEqual({ configured: true, host: "192.168.1.90", username: "admin", hasCredentials: true });
  });
});
