import { describe, expect, it } from "vitest";
import { hashPassword, signSession, verifyPassword, verifySession } from "../src/services/auth.service.js";
import { UserRole } from "../src/generated/prisma/enums.js";

describe("password hashing", () => {
  it("hashes with bcrypt (identifiable by its $2 prefix) and verifies correctly", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("never produces the same hash twice for the same password (per-hash salt)", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
    expect(a).not.toBe(b);
  });
});

describe("session tokens", () => {
  it("signs and verifies a session round-trip", () => {
    const token = signSession({ sub: "user-1", role: UserRole.ADMIN });
    const payload = verifySession(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe(UserRole.ADMIN);
  });

  it("rejects a tampered token", () => {
    const token = signSession({ sub: "user-1", role: UserRole.VIEWER });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifySession(tampered)).toThrow();
  });
});
