import { z } from "zod";

export const sensorSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, digits, and underscores only"),
  label: z.string().min(1).max(200),
  unit: z.string().max(20).optional(),
  correction: z.number().default(0),
  csvColumn: z.number().int().nonnegative().optional(),
});

export type SensorInput = z.infer<typeof sensorSchema>;
