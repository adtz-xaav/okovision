import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../lib/env.js";
import { parseDurationToMs } from "../lib/duration.js";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { hashPassword, signSession, verifyPassword } from "../services/auth.service.js";

export const authRouter = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
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
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? UserRole.ADMIN : UserRole.VIEWER;

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), role },
  });

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
