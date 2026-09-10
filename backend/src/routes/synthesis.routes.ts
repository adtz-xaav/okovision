import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";
import { synthesisRangeQuerySchema, type SynthesisRangeQuery } from "../schemas/synthesisConfig.schema.js";
import {
  getSeasonMonthlyBreakdown,
  getSynthesisRange,
  runDailySynthesisForRange,
} from "../services/synthesis.service.js";

export const synthesisRouter = Router();

synthesisRouter.use(requireAuth);

synthesisRouter.get("/", validateQuery(synthesisRangeQuerySchema), async (req, res) => {
  const { from, to } = req.validatedQuery as SynthesisRangeQuery;
  const rows = await getSynthesisRange(from, to);
  res.json(rows);
});

synthesisRouter.get("/seasons/:id", async (req, res) => {
  const id = String(req.params.id);
  const season = await prisma.season.findUnique({ where: { id } });
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }
  const breakdown = await getSeasonMonthlyBreakdown(season.startDate, season.endDate);
  res.json({ season, ...breakdown });
});

synthesisRouter.post(
  "/run",
  requireRole(UserRole.ADMIN),
  validateBody(synthesisRangeQuerySchema),
  async (req, res) => {
    const { from, to } = req.body as SynthesisRangeQuery;
    const result = await runDailySynthesisForRange(from, to);
    res.json(result);
  },
);
