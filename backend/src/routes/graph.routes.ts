import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";
import { graphDataQuerySchema, graphSchema, type GraphDataQuery, type GraphInput } from "../schemas/graph.schema.js";

export const graphRouter = Router();

graphRouter.use(requireAuth);

const graphInclude = {
  sensors: { include: { sensor: true }, orderBy: { position: "asc" as const } },
};

graphRouter.get("/", async (_req, res) => {
  const graphs = await prisma.graph.findMany({ orderBy: { position: "asc" }, include: graphInclude });
  res.json(graphs);
});

graphRouter.post("/", requireRole(UserRole.ADMIN), validateBody(graphSchema), async (req, res) => {
  const input = req.body as GraphInput;
  try {
    const graph = await prisma.graph.create({
      data: {
        name: input.name,
        position: input.position,
        sensors: { create: input.sensors.map((s) => ({ sensorId: s.sensorId, coefficient: s.coefficient, position: s.position })) },
      },
      include: graphInclude,
    });
    res.status(201).json(graph);
  } catch {
    res.status(400).json({ error: "One of the selected sensors doesn't exist" });
  }
});

graphRouter.put("/:id", requireRole(UserRole.ADMIN), validateBody(graphSchema), async (req, res) => {
  const input = req.body as GraphInput;
  const id = String(req.params.id);
  try {
    const graph = await prisma.$transaction(async (tx) => {
      await tx.graph.update({ where: { id }, data: { name: input.name, position: input.position } });
      await tx.graphSensor.deleteMany({ where: { graphId: id } });
      if (input.sensors.length > 0) {
        await tx.graphSensor.createMany({
          data: input.sensors.map((s) => ({ graphId: id, sensorId: s.sensorId, coefficient: s.coefficient, position: s.position })),
        });
      }
      return tx.graph.findUniqueOrThrow({ where: { id }, include: graphInclude });
    });
    res.json(graph);
  } catch {
    res.status(404).json({ error: "Graph not found, or one of the selected sensors doesn't exist" });
  }
});

graphRouter.delete("/:id", requireRole(UserRole.ADMIN), async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.graph.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Graph not found" });
  }
});

graphRouter.get("/:id/data", validateQuery(graphDataQuerySchema), async (req, res) => {
  const id = String(req.params.id);
  const { from, to } = req.validatedQuery as GraphDataQuery;

  const graph = await prisma.graph.findUnique({ where: { id }, include: graphInclude });
  if (!graph) {
    res.status(404).json({ error: "Graph not found" });
    return;
  }

  const series = await Promise.all(
    graph.sensors.map(async (graphSensor) => {
      const readings = await prisma.sensorReading.findMany({
        where: { sensorId: graphSensor.sensorId, timestamp: { gte: from, lte: to } },
        orderBy: { timestamp: "asc" },
        select: { timestamp: true, value: true },
      });
      return {
        sensorId: graphSensor.sensorId,
        label: graphSensor.sensor.label,
        unit: graphSensor.sensor.unit,
        points: readings.map((r) => ({ timestamp: r.timestamp, value: r.value * graphSensor.coefficient })),
      };
    }),
  );

  res.json({ id: graph.id, name: graph.name, series });
});
