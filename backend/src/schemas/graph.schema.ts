import { z } from "zod";

export const graphSchema = z.object({
  name: z.string().min(1).max(200),
  position: z.number().int().default(0),
  sensors: z
    .array(
      z.object({
        sensorId: z.uuid(),
        coefficient: z.number().default(1),
        position: z.number().int().default(0),
      }),
    )
    .default([]),
});

export type GraphInput = z.infer<typeof graphSchema>;

export const graphDataQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export type GraphDataQuery = z.infer<typeof graphDataQuerySchema>;
