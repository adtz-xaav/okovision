const UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Parses simple durations like "7d", "15m", "30s" into milliseconds — just enough to
// keep the session cookie's maxAge in sync with JWT_EXPIRES_IN.
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: "${duration}"`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNITS[unit];
}
