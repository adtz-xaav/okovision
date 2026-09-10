import { PellematicTouchClient } from "../boiler/PellematicTouchClient.js";
import { prisma } from "../lib/prisma.js";
import { runDailySynthesisForDates, type RunDailySynthesisResult } from "../services/synthesis.service.js";
import { BOILER_INGEST_JOB } from "./boilerIngest.job.js";
import { recordJobRun } from "./scheduler.service.js";

export const DAILY_SYNTHESIS_JOB = "daily-synthesis";

// DAG-triggered: run right after boiler-ingest, over the same set of calendar dates the
// boiler currently has data for, rather than on its own interval — a day's synthesis is
// only ever worth (re)computing once that day's ingestion has had a chance to run.
export async function runDailySynthesisJob(): Promise<RunDailySynthesisResult | null> {
  const connection = await prisma.boilerConnection.findUnique({ where: { id: "singleton" } });
  if (!connection) return null;

  const client = new PellematicTouchClient(connection.host);
  const dates = await client.listAvailableDates();
  return recordJobRun(DAILY_SYNTHESIS_JOB, () => runDailySynthesisForDates(dates), BOILER_INGEST_JOB);
}
