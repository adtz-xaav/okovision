import type { BoilerClient } from "../boiler/BoilerClient.js";
import { prisma } from "../lib/prisma.js";
import { parseTouchCsv } from "./csv.js";

export interface IngestDayResult {
  date: string;
  rowsParsed: number;
  readingsWritten: number;
}

// The boiler logs in its own local wall-clock time with no timezone marker (same as the
// legacy app). We store that wall-clock time verbatim as a UTC-labelled timestamp rather
// than guessing a timezone — consistent, if not literally UTC.
export async function ingestDay(client: BoilerClient, date: string): Promise<IngestDayResult> {
  const sensors = await prisma.sensor.findMany({ where: { csvColumn: { not: null } } });
  if (sensors.length === 0) {
    return { date, rowsParsed: 0, readingsWritten: 0 };
  }

  const csvText = await client.fetchDayCsv(date);
  const rows = parseTouchCsv(csvText);

  const readings: { sensorId: string; timestamp: Date; value: number }[] = [];
  for (const row of rows) {
    for (const sensor of sensors) {
      const raw = row.values[sensor.csvColumn!];
      if (raw === null || raw === undefined) continue;
      readings.push({ sensorId: sensor.id, timestamp: row.timestamp, value: raw + sensor.correction });
    }
  }

  if (readings.length === 0) {
    return { date, rowsParsed: rows.length, readingsWritten: 0 };
  }

  const result = await prisma.sensorReading.createMany({ data: readings, skipDuplicates: true });
  return { date, rowsParsed: rows.length, readingsWritten: result.count };
}

// Mirrors the legacy app's own day-completeness check: a day is "done" once we hold a
// reading at 23:59 — the boiler only writes that row once the day has fully logged.
export async function isDateFullyIngested(date: string): Promise<boolean> {
  const endOfDay = new Date(`${date}T23:59:00.000Z`);
  const count = await prisma.sensorReading.count({ where: { timestamp: endOfDay } });
  return count > 0;
}

export interface RunBoilerIngestResult {
  datesConsidered: number;
  readingsWritten: number;
}

// Ingests every boiler-available date not yet fully ingested — this alone covers both the
// steady-state daily catch-up (today is never "complete" so it's re-pulled every run) and a
// cold-start backfill (an empty database means every available date qualifies), so no
// separate first-run logic is needed.
export async function runBoilerIngest(client: BoilerClient): Promise<RunBoilerIngestResult> {
  const dates = await client.listAvailableDates();
  let readingsWritten = 0;
  for (const date of dates) {
    if (await isDateFullyIngested(date)) continue;
    const result = await ingestDay(client, date);
    readingsWritten += result.readingsWritten;
  }
  return { datesConsidered: dates.length, readingsWritten };
}
