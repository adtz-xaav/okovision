import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword, verifyPassword } from "../src/services/auth.service.js";
import { ResetPasswordUserNotFoundError, resetPassword, resetPasswordArgsSchema } from "../src/scripts/reset-password.js";

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("resetPassword", () => {
  it("hashes and stores the new password for an existing user", async () => {
    const user = await prisma.user.create({
      data: { email: "admin@example.com", passwordHash: await hashPassword("old-password-123"), role: "ADMIN" },
    });

    const result = await resetPassword("admin@example.com", "brand-new-password-456");

    expect(result).toEqual({ email: "admin@example.com", role: "ADMIN" });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await expect(verifyPassword("brand-new-password-456", updated.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("old-password-123", updated.passwordHash)).resolves.toBe(false);
  });

  it("throws ResetPasswordUserNotFoundError for an unknown email", async () => {
    await expect(resetPassword("nobody@example.com", "some-valid-password")).rejects.toThrow(ResetPasswordUserNotFoundError);
  });
});

describe("resetPasswordArgsSchema", () => {
  it("rejects a password shorter than 12 characters", () => {
    const result = resetPasswordArgsSchema.safeParse({ email: "a@example.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = resetPasswordArgsSchema.safeParse({ email: "not-an-email", password: "valid-password-123" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email and password", () => {
    const result = resetPasswordArgsSchema.safeParse({ email: "a@example.com", password: "valid-password-123" });
    expect(result.success).toBe(true);
  });
});
