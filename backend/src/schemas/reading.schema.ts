import { z } from "zod";

export const readingsQuerySchema = z.object({
  sensorId: z.uuid(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ReadingsQuery = z.infer<typeof readingsQuerySchema>;
