import { prisma } from "../lib/prisma.js";
import { isDateFullyIngested } from "./ingestion.service.js";

export interface DailySynthesisResult {
  day: string;
  tcExtMax: number | null;
  tcExtMin: number | null;
  consoKg: number | null;
  dju: number | null;
  nbCycle: number | null;
}

function dayRange(day: string): { start: Date; end: Date } {
  return { start: new Date(`${day}T00:00:00.000Z`), end: new Date(`${day}T23:59:59.999Z`) };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function minMaxForSensor(sensorId: string, start: Date, end: Date): Promise<{ min: number; max: number } | null> {
  const agg = await prisma.sensorReading.aggregate({
    where: { sensorId, timestamp: { gte: start, lte: end } },
    _min: { value: true },
    _max: { value: true },
  });
  if (agg._min.value === null || agg._max.value === null) return null;
  return { min: agg._min.value, max: agg._max.value };
}

async function sumForSensor(sensorId: string, start: Date, end: Date): Promise<number | null> {
  const agg = await prisma.sensorReading.aggregate({
    where: { sensorId, timestamp: { gte: start, lte: end } },
    _sum: { value: true },
  });
  return agg._sum.value;
}

// The Pellematic Touch has no pellet-flow sensor, so consumption is derived the same way
// the legacy app derived it: from the auger's duty cycle each logging interval —
// runSeconds / (runSeconds + pauseSeconds) — summed across the day and scaled by a
// per-minute pellet weight constant. Both sensors must share timestamps (they come from
// the same CSV row during ingestion), so readings are matched by exact timestamp.
async function computeConsoKg(
  augerRunSensorId: string,
  augerPauseSensorId: string,
  start: Date,
  end: Date,
  pelletWeightPerMinuteGrams: number,
): Promise<number | null> {
  const [runReadings, pauseReadings] = await Promise.all([
    prisma.sensorReading.findMany({
      where: { sensorId: augerRunSensorId, timestamp: { gte: start, lte: end } },
      select: { timestamp: true, value: true },
    }),
    prisma.sensorReading.findMany({
      where: { sensorId: augerPauseSensorId, timestamp: { gte: start, lte: end } },
      select: { timestamp: true, value: true },
    }),
  ]);
  if (runReadings.length === 0) return null;

  const pauseByTime = new Map(pauseReadings.map((r) => [r.timestamp.getTime(), r.value]));
  const coeff = pelletWeightPerMinuteGrams / 1000;

  let total = 0;
  for (const run of runReadings) {
    const pause = pauseByTime.get(run.timestamp.getTime());
    if (pause === undefined) continue;
    const denominator = run.value + pause;
    if (denominator <= 0) continue;
    total += (run.value / denominator) * coeff;
  }
  return Math.round(total * 100) / 100;
}

// Computes every metric this day's mapped sensors allow — metrics whose role isn't
// configured yet come back null rather than blocking the others.
export async function computeDailySynthesis(day: string): Promise<DailySynthesisResult> {
  const config = await prisma.synthesisConfig.findUnique({ where: { id: "singleton" } });
  const { start, end } = dayRange(day);

  let tcExtMax: number | null = null;
  let tcExtMin: number | null = null;
  let dju: number | null = null;
  if (config?.outdoorTempSensorId) {
    const minMax = await minMaxForSensor(config.outdoorTempSensorId, start, end);
    if (minMax) {
      tcExtMax = minMax.max;
      tcExtMin = minMax.min;
      const avg = (tcExtMax + tcExtMin) / 2;
      dju = config.referenceTempC <= avg ? 0 : Math.round((config.referenceTempC - avg) * 100) / 100;
    }
  }

  let consoKg: number | null = null;
  if (config?.augerRunSensorId && config?.augerPauseSensorId) {
    consoKg = await computeConsoKg(
      config.augerRunSensorId,
      config.augerPauseSensorId,
      start,
      end,
      config.pelletWeightPerMinuteGrams,
    );
  }

  let nbCycle: number | null = null;
  if (config?.burnerCycleSensorId) {
    const sum = await sumForSensor(config.burnerCycleSensorId, start, end);
    nbCycle = sum === null ? null : Math.round(sum);
  }

  return { day, tcExtMax, tcExtMin, consoKg, dju, nbCycle };
}

export async function saveDailySynthesis(result: DailySynthesisResult) {
  const { day, ...fields } = result;
  return prisma.dailySynthesis.upsert({ where: { day }, create: result, update: fields });
}

export interface RunDailySynthesisResult {
  daysProcessed: number;
}

// Mirrors the legacy app's own rule: never (re)compute today, since its data is still
// incomplete. Recomputes every other day in the candidate list unconditionally (matching
// the legacy default of force-rebuilding), so re-running after fixing the sensor mapping
// or a boiler config change reliably picks up the correction.
export async function runDailySynthesisForDates(candidateDays: string[]): Promise<RunDailySynthesisResult> {
  const cutoff = today();
  let daysProcessed = 0;
  for (const day of candidateDays) {
    if (day >= cutoff) continue;
    if (!(await isDateFullyIngested(day))) continue;
    const result = await computeDailySynthesis(day);
    await saveDailySynthesis(result);
    daysProcessed++;
  }
  return { daysProcessed };
}

function enumerateDays(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function runDailySynthesisForRange(from: string, to: string): Promise<RunDailySynthesisResult> {
  return runDailySynthesisForDates(enumerateDays(from, to));
}

export async function getSynthesisRange(from: string, to: string) {
  return prisma.dailySynthesis.findMany({ where: { day: { gte: from, lte: to } }, orderBy: { day: "asc" } });
}

export interface MonthlySynthesis {
  month: string; // YYYY-MM
  tcExtMax: number | null;
  tcExtMin: number | null;
  consoKg: number | null;
  dju: number | null;
  nbCycle: number | null;
  efficiencyGPerDjuM2: number | null;
}

export async function getSeasonMonthlyBreakdown(
  startDate: Date,
  endDate: Date,
): Promise<{ months: MonthlySynthesis[]; houseSurfaceM2: number }> {
  const from = startDate.toISOString().slice(0, 10);
  const to = endDate.toISOString().slice(0, 10);
  const rows = await getSynthesisRange(from, to);
  const config = await prisma.synthesisConfig.findUnique({ where: { id: "singleton" } });
  const houseSurfaceM2 = config?.houseSurfaceM2 ?? 0;

  const byMonth = new Map<string, DailySynthesisResult[]>();
  for (const row of rows) {
    const month = row.day.slice(0, 7);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(row);
    byMonth.set(month, bucket);
  }

  const months: MonthlySynthesis[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, days]) => {
      const withMax = days.filter((d) => d.tcExtMax !== null);
      const withMin = days.filter((d) => d.tcExtMin !== null);
      const consoValues = days.filter((d) => d.consoKg !== null).map((d) => d.consoKg as number);
      const djuValues = days.filter((d) => d.dju !== null).map((d) => d.dju as number);
      const cycleValues = days.filter((d) => d.nbCycle !== null).map((d) => d.nbCycle as number);

      const consoKg = consoValues.length > 0 ? consoValues.reduce((a, b) => a + b, 0) : null;
      const dju = djuValues.length > 0 ? djuValues.reduce((a, b) => a + b, 0) : null;
      const nbCycle = cycleValues.length > 0 ? cycleValues.reduce((a, b) => a + b, 0) : null;

      const efficiencyGPerDjuM2 =
        consoKg !== null && dju !== null && dju > 0 && houseSurfaceM2 > 0
          ? Math.round(((consoKg * 1000) / dju / houseSurfaceM2) * 100) / 100
          : null;

      return {
        month,
        tcExtMax: withMax.length > 0 ? Math.max(...withMax.map((d) => d.tcExtMax as number)) : null,
        tcExtMin: withMin.length > 0 ? Math.min(...withMin.map((d) => d.tcExtMin as number)) : null,
        consoKg,
        dju,
        nbCycle,
        efficiencyGPerDjuM2,
      };
    });

  return { months, houseSurfaceM2 };
}
