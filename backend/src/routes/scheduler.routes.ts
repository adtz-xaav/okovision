import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { runBoilerIngestJob } from "../scheduler/boilerIngest.job.js";

export const schedulerRouter = Router();

schedulerRouter.use(requireAuth, requireRole(UserRole.ADMIN));

schedulerRouter.post("/jobs/boiler-ingest/run", async (_req, res) => {
  const result = await runBoilerIngestJob();
  if (result === null) {
    res.status(409).json({ error: "No boiler connection configured yet" });
    return;
  }
  res.json(result);
});

schedulerRouter.get("/runs", async (req, res) => {
  const job = typeof req.query.job === "string" ? req.query.job : undefined;
  const runs = await prisma.schedulerRun.findMany({
    where: { job },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.json(runs);
});
