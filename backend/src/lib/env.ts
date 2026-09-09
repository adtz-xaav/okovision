import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_COOKIE_NAME: z.string().min(1).default("okovision_session"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  BOILER_CREDENTIALS_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "BOILER_CREDENTIALS_KEY must be a 32-byte hex string"),
  CORS_ORIGIN: z.string().optional(),
  INGEST_INTERVAL_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
});

export const env = envSchema.parse(process.env);
