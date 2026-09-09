import type { BoilerClient } from "./BoilerClient.js";

const LOG_DIR_PATH = "/logfiles/pelletronic/";
const FILENAME_PATTERN = /touch_(\d{8})\.csv/g;
const REQUEST_TIMEOUT_MS = 10_000;

function dateToFilename(date: string): string {
  return `touch_${date.replaceAll("-", "")}.csv`;
}

function filenameToDate(match: string): string {
  // match is the 8-digit YYYYMMDD capture
  return `${match.slice(0, 4)}-${match.slice(4, 6)}-${match.slice(6, 8)}`;
}

export class PellematicTouchClient implements BoilerClient {
  private readonly baseUrl: string;

  constructor(host: string) {
    this.baseUrl = `http://${host}${LOG_DIR_PATH}`;
  }

  async listAvailableDates(): Promise<string[]> {
    const res = await fetch(this.baseUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) {
      throw new Error(`Boiler log directory returned HTTP ${res.status}`);
    }
    const html = await res.text();
    const dates = new Set<string>();
    for (const match of html.matchAll(FILENAME_PATTERN)) {
      dates.add(filenameToDate(match[1]));
    }
    return [...dates].sort();
  }

  async fetchDayCsv(date: string): Promise<string> {
    const url = `${this.baseUrl}${dateToFilename(date)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) {
      throw new Error(`No boiler log for ${date} (HTTP ${res.status})`);
    }
    return res.text();
  }
}
