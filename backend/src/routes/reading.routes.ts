import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateQuery } from "../middleware/validate.middleware.js";
import { readingsQuerySchema, type ReadingsQuery } from "../schemas/reading.schema.js";

export const readingRouter = Router();

const MAX_POINTS = 10_000;

readingRouter.get("/", requireAuth, validateQuery(readingsQuerySchema), async (req, res) => {
  const { sensorId, from, to } = req.validatedQuery as ReadingsQuery;

  const readings = await prisma.sensorReading.findMany({
    where: {
      sensorId,
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { timestamp: "asc" },
    take: MAX_POINTS,
    select: { timestamp: true, value: true },
  });

  res.json(readings);
});
