import { describe, expect, it } from "vitest";
import { parseTouchCsv } from "../src/services/csv.js";

describe("parseTouchCsv", () => {
  it("parses semicolon-separated rows with comma decimals into timestamped values", () => {
    const csv = ["09.09.2026;00:00:00;18,5;62,0;1", "09.09.2026;00:05:00;18,4;61,8;1"].join("\n");

    const rows = parseTouchCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].timestamp.toISOString()).toBe("2026-09-09T00:00:00.000Z");
    expect(rows[0].values).toEqual([18.5, 62.0, 1]);
    expect(rows[1].timestamp.toISOString()).toBe("2026-09-09T00:05:00.000Z");
  });

  it("treats an empty field as a missing reading rather than zero", () => {
    const rows = parseTouchCsv("09.09.2026;00:00:00;18,5;;1");
    expect(rows[0].values).toEqual([18.5, null, 1]);
  });

  it("skips blank lines and rows with an unparsable date or time", () => {
    const csv = ["09.09.2026;00:00:00;18,5", "", "not-a-date;00:05:00;18,4", "09.09.2026;not-a-time;18,3"].join("\n");
    const rows = parseTouchCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseTouchCsv("")).toEqual([]);
  });

  it("skips the boiler's own header row (real Pellematic Touch export)", () => {
    const header = 'Datum ;Zeit ;AT [°C];ATakt [°C];PE1_BR1 ;HK1 VL Ist[°C];HK1 VL Soll[°C];';
    const csv = [header, "09.09.2026;00:03:47;18,2;17,9;0;32,8;8,0;"].join("\n");

    const rows = parseTouchCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].timestamp.toISOString()).toBe("2026-09-09T00:03:47.000Z");
    // Trailing semicolon produces a harmless trailing null past the last real column.
    expect(rows[0].values).toEqual([18.2, 17.9, 0, 32.8, 8.0, null]);
  });
});
