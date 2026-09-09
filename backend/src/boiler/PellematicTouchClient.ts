import type { BoilerClient } from "./BoilerClient.js";

const LOG_DIR_PATH = "/logfiles/pelletronic/";
const FILENAME_PATTERN = /touch_(\d{8})\.csv/g;
const REQUEST_TIMEOUT_MS = 10_000;
const SESSION_COOKIE_NAME = "pksession";

function dateToFilename(date: string): string {
  return `touch_${date.replaceAll("-", "")}.csv`;
}

function filenameToDate(match: string): string {
  // match is the 8-digit YYYYMMDD capture
  return `${match.slice(0, 4)}-${match.slice(4, 6)}-${match.slice(6, 8)}`;
}

interface LiveApiResult {
  status: string;
  name: string;
  value: string;
}

export class PellematicTouchClient implements BoilerClient {
  private readonly host: string;
  private readonly baseUrl: string;

  constructor(host: string) {
    this.host = host;
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

  // Logs in fresh for every live call rather than caching the session: the boiler's login
  // is a full page-session cookie (not a lightweight token), config can change (host or
  // credentials updated by an admin) between calls, and a boiler dashboard polls at most
  // every few seconds — the extra login round-trip is cheap compared to the complexity of
  // safely invalidating a cached session.
  private async login(username: string, password: string): Promise<string> {
    const res = await fetch(`http://${this.host}/index.cgi`, {
      method: "POST",
      redirect: "manual",
      body: new URLSearchParams({ username, password, language: "en", submit: "Login" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    // A successful login responds with a redirect carrying the session cookie; anything
    // else (200 back to the login page, in practice) means the credentials were rejected.
    if (res.status < 300 || res.status >= 400) {
      throw new Error(`Boiler login was rejected (HTTP ${res.status})`);
    }
    const sessionCookie = res.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (!sessionCookie) {
      throw new Error("Boiler login did not return a session cookie");
    }
    return sessionCookie.split(";")[0];
  }

  async getLiveValues(username: string, password: string, tags: string[]): Promise<Record<string, string>> {
    const cookie = await this.login(username, password);
    const res = await fetch(`http://${this.host}/?action=get`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify(tags),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Boiler live read failed (HTTP ${res.status})`);
    }
    const results = (await res.json()) as LiveApiResult[];
    const values: Record<string, string> = {};
    for (const result of results) {
      if (result.status === "OK") values[result.name] = result.value;
    }
    return values;
  }

  async setLiveValues(username: string, password: string, values: Record<string, string>): Promise<void> {
    const cookie = await this.login(username, password);
    const res = await fetch(`http://${this.host}/?action=set`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify(values),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Boiler live write failed (HTTP ${res.status})`);
    }
  }
}
