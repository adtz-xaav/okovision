import type { BoilerClient } from "../boiler/BoilerClient.js";
import { decryptSecret } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

export interface BoilerCredentials {
  host: string;
  username: string;
  password: string;
}

export interface LiveTagConfig {
  id: string;
  key: string;
  label: string;
  tag: string;
  writable: boolean;
  unit: string | null;
  divisor: number;
}

export interface LiveTagReading {
  id: string;
  key: string;
  label: string;
  tag: string;
  writable: boolean;
  unit: string | null;
  value: number | null;
}

// Null when the live channel hasn't been set up yet (historical-only install) — not itself
// an error, just a state routes need to distinguish from an actual boiler failure.
export async function getBoilerCredentials(): Promise<BoilerCredentials | null> {
  const connection = await prisma.boilerConnection.findUnique({ where: { id: "singleton" } });
  if (!connection?.username || !connection.encryptedPassword) return null;
  return { host: connection.host, username: connection.username, password: decryptSecret(connection.encryptedPassword) };
}

export async function readLiveValues(
  client: BoilerClient,
  credentials: BoilerCredentials,
  liveTags: LiveTagConfig[],
): Promise<LiveTagReading[]> {
  if (liveTags.length === 0) return [];

  const rawValues = await client.getLiveValues(
    credentials.username,
    credentials.password,
    liveTags.map((liveTag) => liveTag.tag),
  );

  return liveTags.map((liveTag) => {
    const raw = rawValues[liveTag.tag];
    const numeric = raw === undefined ? Number.NaN : Number(raw);
    return {
      id: liveTag.id,
      key: liveTag.key,
      label: liveTag.label,
      tag: liveTag.tag,
      writable: liveTag.writable,
      unit: liveTag.unit,
      value: Number.isNaN(numeric) ? null : numeric / liveTag.divisor,
    };
  });
}

export async function writeLiveValue(
  client: BoilerClient,
  credentials: BoilerCredentials,
  liveTag: Pick<LiveTagConfig, "tag" | "divisor">,
  displayValue: number,
): Promise<void> {
  const rawValue = String(Math.round(displayValue * liveTag.divisor));
  await client.setLiveValues(credentials.username, credentials.password, { [liveTag.tag]: rawValue });
}
