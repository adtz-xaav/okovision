import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { siloEventSchema, type SiloEventInput } from "../schemas/siloEvent.schema.js";

export const siloEventRouter = Router();

siloEventRouter.use(requireAuth);

siloEventRouter.get("/", async (_req, res) => {
  const events = await prisma.siloEvent.findMany({ orderBy: { occurredAt: "desc" } });
  res.json(events);
});

siloEventRouter.post("/", requireRole(UserRole.ADMIN), validateBody(siloEventSchema), async (req, res) => {
  const input = req.body as SiloEventInput;
  const event = await prisma.siloEvent.create({ data: input });
  res.status(201).json(event);
});

siloEventRouter.put("/:id", requireRole(UserRole.ADMIN), validateBody(siloEventSchema), async (req, res) => {
  const input = req.body as SiloEventInput;
  const id = String(req.params.id);
  try {
    const event = await prisma.siloEvent.update({ where: { id }, data: input });
    res.json(event);
  } catch {
    res.status(404).json({ error: "Silo event not found" });
  }
});

siloEventRouter.delete("/:id", requireRole(UserRole.ADMIN), async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.siloEvent.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Silo event not found" });
  }
});
