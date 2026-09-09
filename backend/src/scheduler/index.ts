import { env } from "../lib/env.js";
import { runBoilerIngestJob } from "./boilerIngest.job.js";

export function startScheduler(): void {
  setInterval(() => {
    runBoilerIngestJob().catch((err) => {
      console.error("boiler-ingest job failed:", err);
    });
  }, env.INGEST_INTERVAL_MS);
}
