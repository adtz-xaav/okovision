import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { seasonSchema, type SeasonInput } from "../schemas/season.schema.js";

export const seasonRouter = Router();

seasonRouter.use(requireAuth);

seasonRouter.get("/", async (_req, res) => {
  const seasons = await prisma.season.findMany({ orderBy: { startDate: "desc" } });
  res.json(seasons);
});

seasonRouter.post("/", requireRole(UserRole.ADMIN), validateBody(seasonSchema), async (req, res) => {
  const input = req.body as SeasonInput;
  const season = await prisma.season.create({ data: input });
  res.status(201).json(season);
});

seasonRouter.put("/:id", requireRole(UserRole.ADMIN), validateBody(seasonSchema), async (req, res) => {
  const input = req.body as SeasonInput;
  const id = String(req.params.id);
  try {
    const season = await prisma.season.update({ where: { id }, data: input });
    res.json(season);
  } catch {
    res.status(404).json({ error: "Season not found" });
  }
});

seasonRouter.delete("/:id", requireRole(UserRole.ADMIN), async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.season.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Season not found" });
  }
});
