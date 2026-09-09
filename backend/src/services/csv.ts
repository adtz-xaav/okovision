// Parses the boiler's daily CSV log: semicolon-separated, comma as decimal separator,
// first column "jour" (dd.mm.yyyy), second "heure" (hh:mm:ss), then one value column per
// configured sensor (see Sensor.csvColumn, 0-based over these remaining columns).

export interface TouchCsvRow {
  timestamp: Date;
  values: (number | null)[];
}

function parseValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimestamp(jour: string, heure: string): Date | null {
  const dateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(jour.trim());
  const timeMatch = /^(\d{2}):(\d{2}):(\d{2})$/.exec(heure.trim());
  if (!dateMatch || !timeMatch) return null;
  const [, day, month, year] = dateMatch;
  const [, hour, minute, second] = timeMatch;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTouchCsv(csvText: string): TouchCsvRow[] {
  const rows: TouchCsvRow[] = [];
  for (const line of csvText.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const columns = line.split(";");
    if (columns.length < 2) continue;
    const [jour, heure, ...rest] = columns;
    const timestamp = parseTimestamp(jour, heure);
    if (!timestamp) continue;
    rows.push({ timestamp, values: rest.map(parseValue) });
  }
  return rows;
}
