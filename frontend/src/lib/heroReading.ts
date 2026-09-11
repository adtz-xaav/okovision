import type { LiveReading } from "./api";

/** The featured reading for the ambient "Now" view: the first writable
 * tag if any is configured (it's the one thing worth a control for),
 * otherwise just the first reading so there's always something to show. */
export function pickHeroReading(readings: LiveReading[]): LiveReading | null {
  return readings.find((r) => r.writable) ?? readings[0] ?? null;
}
