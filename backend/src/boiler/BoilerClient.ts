// Two channels to the boiler. The historical one (log files served by the boiler's own web
// server) needs no login; the live one drives the boiler's own admin web UI session and
// needs credentials per call — see PellematicTouchClient for what was verified against a
// real Pellematic Touch and what's still assumption.
export interface BoilerClient {
  /** Calendar dates (YYYY-MM-DD) for which a daily CSV log currently exists on the boiler. */
  listAvailableDates(): Promise<string[]>;

  /** Raw CSV text for one day's log. Throws if that day has no log file. */
  fetchDayCsv(date: string): Promise<string>;

  /**
   * Human-readable label for each CSV data column, in order (index 0 = first column after
   * jour/heure) — the boiler documents its own column layout at `titles.csv`, so admins
   * don't have to guess CSV column mappings by hand.
   */
  fetchColumnTitles(): Promise<string[]>;

  /**
   * Reads the current raw value of each given tag path (e.g. "CAPPL:LOCAL.oekomode") from
   * the boiler's live web UI. Logs in fresh on every call — see PellematicTouchClient for
   * why. Tags the boiler doesn't recognize are silently omitted from the result rather than
   * failing the whole batch (that's how the boiler's own API behaves).
   */
  getLiveValues(username: string, password: string, tags: string[]): Promise<Record<string, string>>;

  /**
   * Writes raw values back to the boiler by tag path. Throws if the login or the write
   * request itself fails. Unlike getLiveValues, the boiler's per-tag acceptance/rejection
   * on a write has not been verified against real hardware — verify this against your own
   * boiler before relying on it.
   */
  setLiveValues(username: string, password: string, values: Record<string, string>): Promise<void>;
}
