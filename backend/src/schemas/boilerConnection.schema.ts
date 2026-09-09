import { z } from "zod";

export const boilerConnectionSchema = z
  .object({
    host: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9.-]+$/, "Use a plain hostname or IP address"),
    // The boiler's own web UI login — separate from Okovision accounts. Optional: a
    // historical-only setup never needs it. Provide both together, or neither.
    username: z.string().min(1).max(100).optional(),
    password: z.string().min(1).max(200).optional(),
  })
  .refine((data) => (data.username === undefined) === (data.password === undefined), {
    message: "Provide both a username and password, or neither",
    path: ["password"],
  });

export type BoilerConnectionInput = z.infer<typeof boilerConnectionSchema>;
