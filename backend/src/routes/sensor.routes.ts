import { Router } from "express";
import { PellematicTouchClient } from "../boiler/PellematicTouchClient.js";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { sensorSchema, type SensorInput } from "../schemas/sensor.schema.js";
import { importSensorsFromBoiler } from "../services/sensorImport.service.js";

export const sensorRouter = Router();

sensorRouter.use(requireAuth);

sensorRouter.get("/", async (_req, res) => {
  const sensors = await prisma.sensor.findMany({ orderBy: { label: "asc" } });
  res.json(sensors);
});

sensorRouter.post("/import-from-boiler", requireRole(UserRole.ADMIN), async (_req, res) => {
  const connection = await prisma.boilerConnection.findUnique({ where: { id: "singleton" } });
  if (!connection) {
    res.status(409).json({ error: "No boiler connection configured yet" });
    return;
  }
  const client = new PellematicTouchClient(connection.host);
  const result = await importSensorsFromBoiler(client);
  res.json(result);
});

sensorRouter.post("/", requireRole(UserRole.ADMIN), validateBody(sensorSchema), async (req, res) => {
  const input = req.body as SensorInput;
  try {
    const sensor = await prisma.sensor.create({ data: input });
    res.status(201).json(sensor);
  } catch {
    res.status(409).json({ error: "A sensor with this key or CSV column already exists" });
  }
});

sensorRouter.put("/:id", requireRole(UserRole.ADMIN), validateBody(sensorSchema), async (req, res) => {
  const input = req.body as SensorInput;
  const id = String(req.params.id);
  try {
    const sensor = await prisma.sensor.update({ where: { id }, data: input });
    res.json(sensor);
  } catch {
    res.status(404).json({ error: "Sensor not found, or the key/CSV column is already in use" });
  }
});

sensorRouter.delete("/:id", requireRole(UserRole.ADMIN), async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.sensor.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Sensor not found" });
  }
});
