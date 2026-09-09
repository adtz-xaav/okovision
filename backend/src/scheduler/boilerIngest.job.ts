import { PellematicTouchClient } from "../boiler/PellematicTouchClient.js";
import { prisma } from "../lib/prisma.js";
import { runBoilerIngest, type RunBoilerIngestResult } from "../services/ingestion.service.js";
import { recordJobRun } from "./scheduler.service.js";

export const BOILER_INGEST_JOB = "boiler-ingest";

// Returns null (rather than running) when no boiler host is configured yet — this is the
// expected state right after a fresh install, not an error.
export async function runBoilerIngestJob(): Promise<RunBoilerIngestResult | null> {
  const connection = await prisma.boilerConnection.findUnique({ where: { id: "singleton" } });
  if (!connection) return null;

  const client = new PellematicTouchClient(connection.host);
  return recordJobRun(BOILER_INGEST_JOB, () => runBoilerIngest(client));
}
