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
// reading in its last logged minute (23:59) — the boiler only writes one that late once the
// day has fully logged. The exact second varies with the boiler's own polling offset (real
// hardware logs its last row of the day at 23:59:47, not exactly :00), so this checks the
// whole 23:59 minute rather than one exact instant.
export async function isDateFullyIngested(date: string): Promise<boolean> {
  const count = await prisma.sensorReading.count({
    where: {
      timestamp: {
        gte: new Date(`${date}T23:59:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      },
    },
  });
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
