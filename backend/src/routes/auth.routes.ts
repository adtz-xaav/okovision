import { Router } from "express";
import rateLimit, { MemoryStore } from "express-rate-limit";
import { env } from "../lib/env.js";
import { parseDurationToMs } from "../lib/duration.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { UserRole } from "../generated/prisma/enums.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { hashPassword, signSession, verifyPassword } from "../services/auth.service.js";

export const authRouter = Router();

// Exposed as a named store (rather than relying on the default) so tests can call
// `authRateLimitStore.resetAll()` between cases — the rate-limit middleware itself only
// exposes `resetKey`, not `resetAll`.
export const authRateLimitStore = new MemoryStore();

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: authRateLimitStore,
});

const sessionCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "strict" as const,
  maxAge: parseDurationToMs(env.JWT_EXPIRES_IN),
};

authRouter.post("/register", authRateLimit, validateBody(registerSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  // The first account on a fresh instance becomes the admin/owner; anyone after that is a viewer.
  // A Serializable transaction is used so two concurrent registrations can't both observe user
  // count 0: Postgres aborts one side with a serialization failure (P2034), which we retry a few
  // times. The "User_singleton_admin" partial unique index (see migrations) is the hard backstop —
  // if a retry still lands as ADMIN after someone else already committed, the insert itself fails
  // with P2002 and we fall back to creating a VIEWER instead of a 500.
  const passwordHash = await hashPassword(password);
  let user;
  const maxAttempts = 5;
  for (let attempt = 1; ; attempt++) {
    try {
      user = await prisma.$transaction(
        async (tx) => {
          const userCount = await tx.user.count();
          const role = userCount === 0 ? UserRole.ADMIN : UserRole.VIEWER;
          return tx.user.create({ data: { email, passwordHash, role } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      break;
    } catch (err) {
      const lostAdminRace =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        String(err.meta?.target ?? "").includes("admin");
      if (lostAdminRace) {
        user = await prisma.user.create({ data: { email, passwordHash, role: UserRole.VIEWER } });
        break;
      }
      const serializationConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (!serializationConflict || attempt >= maxAttempts) throw err;
    }
  }

  const token = signSession({ sub: user.id, role: user.role });
  res.cookie(env.JWT_COOKIE_NAME, token, sessionCookieOptions);
  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

authRouter.post("/login", authRateLimit, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signSession({ sub: user.id, role: user.role });
  res.cookie(env.JWT_COOKIE_NAME, token, sessionCookieOptions);
  res.json({ id: user.id, email: user.email, role: user.role });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(env.JWT_COOKIE_NAME, sessionCookieOptions);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ id: user.id, email: user.email, role: user.role });
});
