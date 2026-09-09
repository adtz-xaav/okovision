import request from "supertest";
import type { Express } from "express";

export async function registerAndLogin(app: Express, email: string, password = "correct-horse-battery") {
  const res = await request(app).post("/api/auth/register").send({ email, password });
  return { cookie: res.headers["set-cookie"] as unknown as string[], user: res.body };
}
