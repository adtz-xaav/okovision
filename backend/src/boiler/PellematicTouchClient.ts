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

  private async getText(path: string, notFoundMessage: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) {
      throw new Error(`${notFoundMessage} (HTTP ${res.status})`);
    }
    return res.text();
  }

  async listAvailableDates(): Promise<string[]> {
    const html = await this.getText("", "Boiler log directory unavailable");
    const dates = new Set<string>();
    for (const match of html.matchAll(FILENAME_PATTERN)) {
      dates.add(filenameToDate(match[1]));
    }
    return [...dates].sort();
  }

  async fetchDayCsv(date: string): Promise<string> {
    return this.getText(dateToFilename(date), `No boiler log for ${date}`);
  }

  async fetchColumnTitles(): Promise<string[]> {
    const csv = await this.getText("titles.csv", "Boiler column titles unavailable");
    const titles: string[] = [];
    for (const line of csv.split(/\r?\n/)) {
      if (line.trim() === "") continue;
      const separatorIndex = line.indexOf(";");
      if (separatorIndex === -1) continue;
      const index = Number(line.slice(0, separatorIndex).trim());
      const label = line.slice(separatorIndex + 1).trim();
      if (!Number.isInteger(index) || index < 0) continue;
      titles[index] = label;
    }
    return titles;
  }
}
