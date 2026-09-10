import { env } from "../lib/env.js";
import { runBoilerIngestJob } from "./boilerIngest.job.js";
import { runDailySynthesisJob } from "./dailySynthesis.job.js";

export function startScheduler(): void {
  setInterval(() => {
    runBoilerIngestJob()
      .then(() => runDailySynthesisJob())
      .catch((err) => {
        console.error("boiler-ingest / daily-synthesis job failed:", err);
      });
  }, env.INGEST_INTERVAL_MS);
}
