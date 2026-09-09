import { Router } from "express";
import { encryptSecret } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { boilerConnectionSchema, type BoilerConnectionInput } from "../schemas/boilerConnection.schema.js";

export const boilerConnectionRouter = Router();

boilerConnectionRouter.use(requireAuth, requireRole(UserRole.ADMIN));

function toResponse(connection: { host: string; username: string | null } | null) {
  if (!connection) return { configured: false };
  // The encrypted password itself is never sent to the client — only whether one is set.
  return { configured: true, host: connection.host, username: connection.username, hasCredentials: connection.username !== null };
}

boilerConnectionRouter.get("/", async (_req, res) => {
  const connection = await prisma.boilerConnection.findUnique({ where: { id: "singleton" } });
  res.json(toResponse(connection));
});

boilerConnectionRouter.put("/", validateBody(boilerConnectionSchema), async (req, res) => {
  const { host, username, password } = req.body as BoilerConnectionInput;
  const credentials = username && password ? { username, encryptedPassword: encryptSecret(password) } : {};

  const connection = await prisma.boilerConnection.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", host, ...credentials },
    update: { host, ...credentials },
  });
  res.json(toResponse(connection));
});
