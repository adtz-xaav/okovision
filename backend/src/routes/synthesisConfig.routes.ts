import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { synthesisConfigSchema, type SynthesisConfigInput } from "../schemas/synthesisConfig.schema.js";

export const synthesisConfigRouter = Router();

synthesisConfigRouter.use(requireAuth, requireRole(UserRole.ADMIN));

synthesisConfigRouter.get("/", async (_req, res) => {
  const config = await prisma.synthesisConfig.findUnique({ where: { id: "singleton" } });
  res.json(config ?? synthesisConfigSchema.parse({}));
});

synthesisConfigRouter.put("/", validateBody(synthesisConfigSchema), async (req, res) => {
  const input = req.body as SynthesisConfigInput;
  try {
    const config = await prisma.synthesisConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...input },
      update: input,
    });
    res.json(config);
  } catch {
    res.status(400).json({ error: "One of the selected sensors doesn't exist, or is already assigned to another role" });
  }
});
