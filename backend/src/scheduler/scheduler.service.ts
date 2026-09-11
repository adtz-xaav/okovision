import { SchedulerRunStatus } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

// Wraps a job with SchedulerRun bookkeeping (start/finish/status/error) — the audit trail
// CLAUDE.md's SchedulerService concept is tracked by. `triggeredBy` names the upstream job
// that fired this one for a DAG-dependency trigger (e.g. daily-synthesis after
// boiler-ingest) — omitted for interval/manual runs.
export async function recordJobRun<T>(job: string, fn: () => Promise<T>, triggeredBy?: string): Promise<T> {
  const run = await prisma.schedulerRun.create({ data: { job, status: SchedulerRunStatus.RUNNING, triggeredBy } });
  try {
    const result = await fn();
    await prisma.schedulerRun.update({
      where: { id: run.id },
      data: { status: SchedulerRunStatus.SUCCESS, finishedAt: new Date() },
    });
    return result;
  } catch (err) {
    await prisma.schedulerRun.update({
      where: { id: run.id },
      data: {
        status: SchedulerRunStatus.FAILED,
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
