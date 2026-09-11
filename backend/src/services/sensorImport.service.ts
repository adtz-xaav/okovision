import type { BoilerClient } from "../boiler/BoilerClient.js";
import { prisma } from "../lib/prisma.js";

export interface ImportSensorsResult {
  created: number;
  skipped: number;
}

// Bulk-creates sensors from the boiler's own titles.csv, skipping any CSV column that
// already has a sensor mapped — safe to re-run without duplicating or clobbering an
// admin's existing customizations.
export async function importSensorsFromBoiler(client: BoilerClient): Promise<ImportSensorsResult> {
  const titles = await client.fetchColumnTitles();
  const existing = await prisma.sensor.findMany({
    where: { csvColumn: { not: null } },
    select: { csvColumn: true },
  });
  const mappedColumns = new Set(existing.map((sensor) => sensor.csvColumn));

  let created = 0;
  let skipped = 0;
  for (let index = 0; index < titles.length; index++) {
    const label = titles[index];
    if (!label || mappedColumns.has(index)) {
      skipped++;
      continue;
    }
    try {
      await prisma.sensor.create({ data: { key: `csv_${index}`, label, csvColumn: index } });
      created++;
    } catch {
      // Key collision with a sensor an admin already created by hand — leave it alone.
      skipped++;
    }
  }
  return { created, skipped };
}
