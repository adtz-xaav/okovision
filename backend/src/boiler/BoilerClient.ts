// The historical channel: the boiler exposes one CSV log file per day at a fixed path on
// its own web server. This interface covers that channel only — the live tag-session
// channel (reading/writing the boiler's own settings) is a separate, Phase 2 concern that
// will extend this interface when it's built, rather than being stubbed out ahead of need.
export interface BoilerClient {
  /** Calendar dates (YYYY-MM-DD) for which a daily CSV log currently exists on the boiler. */
  listAvailableDates(): Promise<string[]>;

  /** Raw CSV text for one day's log. Throws if that day has no log file. */
  fetchDayCsv(date: string): Promise<string>;
}
