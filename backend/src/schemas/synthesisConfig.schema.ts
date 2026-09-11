import { z } from "zod";

export const synthesisConfigSchema = z.object({
  outdoorTempSensorId: z.uuid().nullable().default(null),
  augerRunSensorId: z.uuid().nullable().default(null),
  augerPauseSensorId: z.uuid().nullable().default(null),
  burnerCycleSensorId: z.uuid().nullable().default(null),
  pelletWeightPerMinuteGrams: z.number().nonnegative().default(0),
  referenceTempC: z.number().default(18),
  houseSurfaceM2: z.number().nonnegative().default(0),
});

export type SynthesisConfigInput = z.infer<typeof synthesisConfigSchema>;

export const synthesisRangeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
});

export type SynthesisRangeQuery = z.infer<typeof synthesisRangeQuerySchema>;
