import { z } from "zod";

export const siloEventSchema = z.object({
  occurredAt: z.coerce.date(),
  quantityKg: z.number().positive(),
  note: z.string().max(500).optional(),
});

export type SiloEventInput = z.infer<typeof siloEventSchema>;
