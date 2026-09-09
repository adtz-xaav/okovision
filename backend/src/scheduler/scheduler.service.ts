import { SchedulerRunStatus } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

// Wraps a job with SchedulerRun bookkeeping (start/finish/status/error) — the audit trail
// CLAUDE.md's SchedulerService concept is tracked by, and the DAG dependency hook for later
// jobs (e.g. Phase 3's daily synthesis) will build on the same table.
export async function recordJobRun<T>(job: string, fn: () => Promise<T>): Promise<T> {
  const run = await prisma.schedulerRun.create({ data: { job, status: SchedulerRunStatus.RUNNING } });
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
