import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/auth.service.js";

export const resetPasswordArgsSchema = z.object({
  email: z.email(),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export class ResetPasswordUserNotFoundError extends Error {}

/** Resets a user's password, hashing it the same way registration/login do. Throws
 * ResetPasswordUserNotFoundError if no user has that email. */
export async function resetPassword(email: string, password: string): Promise<{ email: string; role: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ResetPasswordUserNotFoundError(`No user found with email ${email}`);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { email: user.email, role: user.role };
}

async function main() {
  const [email, password] = process.argv.slice(2);
  const parsed = resetPasswordArgsSchema.safeParse({ email, password });

  if (!parsed.success) {
    console.error("Usage: reset-password <email> <newPassword>");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".") || "password"}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  try {
    const user = await resetPassword(parsed.data.email, parsed.data.password);
    console.log(`Password reset for ${user.email} (${user.role}).`);
  } catch (error) {
    if (error instanceof ResetPasswordUserNotFoundError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

// Only run the CLI entrypoint when this file is executed directly (`tsx`/`node`), not
// when imported by tests.
if (process.argv[1]?.endsWith("reset-password.js") || process.argv[1]?.endsWith("reset-password.ts")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
