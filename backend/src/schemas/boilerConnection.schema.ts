import { z } from "zod";

export const boilerConnectionSchema = z.object({
  host: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9.-]+$/, "Use a plain hostname or IP address"),
});

export type BoilerConnectionInput = z.infer<typeof boilerConnectionSchema>;
