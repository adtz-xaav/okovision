import { z } from "zod";

export const liveTagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, digits, and underscores only"),
  label: z.string().min(1).max(200),
  tag: z.string().min(1).max(200).startsWith("CAPPL:", "Must be a real boiler tag path, e.g. CAPPL:LOCAL.oekomode"),
  writable: z.boolean().default(false),
  divisor: z.number().positive().default(1),
  unit: z.string().max(20).optional(),
});

export type LiveTagInput = z.infer<typeof liveTagSchema>;

export const setLiveValueSchema = z.object({
  value: z.number(),
});

export type SetLiveValueInput = z.infer<typeof setLiveValueSchema>;
