import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { boilerConnectionSchema, type BoilerConnectionInput } from "../schemas/boilerConnection.schema.js";

export const boilerConnectionRouter = Router();

boilerConnectionRouter.use(requireAuth, requireRole(UserRole.ADMIN));

boilerConnectionRouter.get("/", async (_req, res) => {
  const connection = await prisma.boilerConnection.findUnique({ where: { id: "singleton" } });
  res.json(connection ?? { configured: false });
});

boilerConnectionRouter.put("/", validateBody(boilerConnectionSchema), async (req, res) => {
  const { host } = req.body as BoilerConnectionInput;
  const connection = await prisma.boilerConnection.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", host },
    update: { host },
  });
  res.json(connection);
});
