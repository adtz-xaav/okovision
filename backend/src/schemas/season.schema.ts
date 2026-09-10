import { z } from "zod";

export const seasonSchema = z
  .object({
    label: z.string().min(1).max(200),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "startDate must be before endDate",
    path: ["endDate"],
  });

export type SeasonInput = z.infer<typeof seasonSchema>;
