import { Router } from "express";
import { PellematicTouchClient } from "../boiler/PellematicTouchClient.js";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { liveTagSchema, setLiveValueSchema, type LiveTagInput, type SetLiveValueInput } from "../schemas/liveTag.schema.js";
import { getBoilerCredentials, readLiveValues, writeLiveValue } from "../services/liveBoiler.service.js";

export const liveTagRouter = Router();

liveTagRouter.use(requireAuth);

liveTagRouter.get("/", async (_req, res) => {
  const liveTags = await prisma.liveTag.findMany({ orderBy: { label: "asc" } });
  res.json(liveTags);
});

liveTagRouter.get("/values", async (_req, res) => {
  const credentials = await getBoilerCredentials();
  if (!credentials) {
    res.status(409).json({ error: "Boiler live credentials are not configured" });
    return;
  }
  const liveTags = await prisma.liveTag.findMany({ orderBy: { label: "asc" } });
  const client = new PellematicTouchClient(credentials.host);
  const readings = await readLiveValues(client, credentials, liveTags);
  res.json(readings);
});

liveTagRouter.post("/", requireRole(UserRole.ADMIN), validateBody(liveTagSchema), async (req, res) => {
  const input = req.body as LiveTagInput;
  try {
    const liveTag = await prisma.liveTag.create({ data: input });
    res.status(201).json(liveTag);
  } catch {
    res.status(409).json({ error: "A live tag with this key or boiler tag path already exists" });
  }
});

liveTagRouter.put("/:id", requireRole(UserRole.ADMIN), validateBody(liveTagSchema), async (req, res) => {
  const input = req.body as LiveTagInput;
  const id = String(req.params.id);
  try {
    const liveTag = await prisma.liveTag.update({ where: { id }, data: input });
    res.json(liveTag);
  } catch {
    res.status(404).json({ error: "Live tag not found, or the key/tag path is already in use" });
  }
});

liveTagRouter.delete("/:id", requireRole(UserRole.ADMIN), async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.liveTag.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Live tag not found" });
  }
});

liveTagRouter.post("/:id/set", requireRole(UserRole.ADMIN), validateBody(setLiveValueSchema), async (req, res) => {
  const id = String(req.params.id);
  const { value } = req.body as SetLiveValueInput;

  const liveTag = await prisma.liveTag.findUnique({ where: { id } });
  if (!liveTag) {
    res.status(404).json({ error: "Live tag not found" });
    return;
  }
  if (!liveTag.writable) {
    res.status(400).json({ error: "This tag is not marked as writable" });
    return;
  }
  if (liveTag.minValue !== null && value < liveTag.minValue) {
    res.status(400).json({ error: `Value must be >= ${liveTag.minValue}` });
    return;
  }
  if (liveTag.maxValue !== null && value > liveTag.maxValue) {
    res.status(400).json({ error: `Value must be <= ${liveTag.maxValue}` });
    return;
  }
  const credentials = await getBoilerCredentials();
  if (!credentials) {
    res.status(409).json({ error: "Boiler live credentials are not configured" });
    return;
  }

  const client = new PellematicTouchClient(credentials.host);
  await writeLiveValue(client, credentials, liveTag, value);
  res.status(204).send();
});
