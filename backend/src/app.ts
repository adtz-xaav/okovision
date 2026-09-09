import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./lib/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { boilerConnectionRouter } from "./routes/boilerConnection.routes.js";
import { liveTagRouter } from "./routes/liveTag.routes.js";
import { readingRouter } from "./routes/reading.routes.js";
import { schedulerRouter } from "./routes/scheduler.routes.js";
import { sensorRouter } from "./routes/sensor.routes.js";

export function createApp() {
  const app = express();

  // Trust the first hop only: in this deployment, nginx (the frontend container) is the
  // sole reverse proxy in front of the backend, so its X-Forwarded-* headers are trustworthy.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN?.split(",") ?? false,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/sensors", sensorRouter);
  app.use("/api/boiler-connection", boilerConnectionRouter);
  app.use("/api/live-tags", liveTagRouter);
  app.use("/api/readings", readingRouter);
  app.use("/api/scheduler", schedulerRouter);

  return app;
}
