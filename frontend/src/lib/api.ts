export type SessionUser = {
  id: string;
  email: string;
  role: "ADMIN" | "VIEWER";
};

export type Sensor = {
  id: string;
  key: string;
  label: string;
  unit: string | null;
  correction: number;
  csvColumn: number | null;
};

export type SensorInput = {
  key: string;
  label: string;
  unit?: string;
  correction: number;
  csvColumn?: number;
};

export type BoilerConnection =
  | { configured: false }
  | { configured: true; host: string; username: string | null; hasCredentials: boolean };

export type Reading = { timestamp: string; value: number };

export type SchedulerRun = {
  id: string;
  job: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
};

export type LiveTag = {
  id: string;
  key: string;
  label: string;
  tag: string;
  writable: boolean;
  divisor: number;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
};

export type LiveTagInput = {
  key: string;
  label: string;
  tag: string;
  writable: boolean;
  divisor: number;
  unit?: string;
  minValue?: number;
  maxValue?: number;
};

export type LiveReading = {
  id: string;
  key: string;
  label: string;
  tag: string;
  writable: boolean;
  unit: string | null;
  value: number | null;
};

export type Season = { id: string; label: string; startDate: string; endDate: string };
export type SeasonInput = { label: string; startDate: string; endDate: string };

export type SiloEvent = { id: string; occurredAt: string; quantityKg: number; note: string | null };
export type SiloEventInput = { occurredAt: string; quantityKg: number; note?: string };

export type GraphSensorEntry = {
  id: string;
  sensorId: string;
  coefficient: number;
  position: number;
  sensor: Sensor;
};

export type Graph = { id: string; name: string; position: number; sensors: GraphSensorEntry[] };
export type GraphInput = { name: string; position: number; sensors: { sensorId: string; coefficient: number; position: number }[] };

export type GraphSeries = { sensorId: string; label: string; unit: string | null; points: { timestamp: string; value: number }[] };
export type GraphData = { id: string; name: string; series: GraphSeries[] };

export type SynthesisConfig = {
  outdoorTempSensorId: string | null;
  augerRunSensorId: string | null;
  augerPauseSensorId: string | null;
  burnerCycleSensorId: string | null;
  pelletWeightPerMinuteGrams: number;
  referenceTempC: number;
  houseSurfaceM2: number;
};

export type DailySynthesis = {
  day: string;
  tcExtMax: number | null;
  tcExtMin: number | null;
  consoKg: number | null;
  dju: number | null;
  nbCycle: number | null;
};

export type MonthlySynthesis = {
  month: string;
  tcExtMax: number | null;
  tcExtMin: number | null;
  consoKg: number | null;
  dju: number | null;
  nbCycle: number | null;
  efficiencyGPerDjuM2: number | null;
};

export type SeasonSynthesis = { season: Season; months: MonthlySynthesis[]; houseSurfaceM2: number };

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<SessionUser>("/auth/me"),
  login: (email: string, password: string) =>
    request<SessionUser>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) =>
    request<SessionUser>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),

  listSensors: () => request<Sensor[]>("/sensors"),
  importSensorsFromBoiler: () =>
    request<{ created: number; skipped: number }>("/sensors/import-from-boiler", { method: "POST" }),
  createSensor: (input: SensorInput) => request<Sensor>("/sensors", { method: "POST", body: JSON.stringify(input) }),
  updateSensor: (id: string, input: SensorInput) =>
    request<Sensor>(`/sensors/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteSensor: (id: string) => request<void>(`/sensors/${id}`, { method: "DELETE" }),

  getBoilerConnection: () => request<BoilerConnection>("/boiler-connection"),
  setBoilerConnection: (host: string, username?: string, password?: string) =>
    request<BoilerConnection>("/boiler-connection", {
      method: "PUT",
      body: JSON.stringify({ host, ...(username && password ? { username, password } : {}) }),
    }),

  getReadings: (sensorId: string, from?: string, to?: string) => {
    const params = new URLSearchParams({ sensorId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request<Reading[]>(`/readings?${params.toString()}`);
  },

  runBoilerIngest: () => request<{ datesConsidered: number; readingsWritten: number }>("/scheduler/jobs/boiler-ingest/run", {
    method: "POST",
  }),
  listSchedulerRuns: () => request<SchedulerRun[]>("/scheduler/runs"),

  listLiveTags: () => request<LiveTag[]>("/live-tags"),
  createLiveTag: (input: LiveTagInput) => request<LiveTag>("/live-tags", { method: "POST", body: JSON.stringify(input) }),
  updateLiveTag: (id: string, input: LiveTagInput) =>
    request<LiveTag>(`/live-tags/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteLiveTag: (id: string) => request<void>(`/live-tags/${id}`, { method: "DELETE" }),
  getLiveValues: () => request<LiveReading[]>("/live-tags/values"),
  setLiveValue: (id: string, value: number) =>
    request<void>(`/live-tags/${id}/set`, { method: "POST", body: JSON.stringify({ value }) }),

  listSeasons: () => request<Season[]>("/seasons"),
  createSeason: (input: SeasonInput) => request<Season>("/seasons", { method: "POST", body: JSON.stringify(input) }),
  updateSeason: (id: string, input: SeasonInput) =>
    request<Season>(`/seasons/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteSeason: (id: string) => request<void>(`/seasons/${id}`, { method: "DELETE" }),

  listSiloEvents: () => request<SiloEvent[]>("/silo-events"),
  createSiloEvent: (input: SiloEventInput) => request<SiloEvent>("/silo-events", { method: "POST", body: JSON.stringify(input) }),
  updateSiloEvent: (id: string, input: SiloEventInput) =>
    request<SiloEvent>(`/silo-events/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteSiloEvent: (id: string) => request<void>(`/silo-events/${id}`, { method: "DELETE" }),

  listGraphs: () => request<Graph[]>("/graphs"),
  createGraph: (input: GraphInput) => request<Graph>("/graphs", { method: "POST", body: JSON.stringify(input) }),
  updateGraph: (id: string, input: GraphInput) => request<Graph>(`/graphs/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteGraph: (id: string) => request<void>(`/graphs/${id}`, { method: "DELETE" }),
  getGraphData: (id: string, from: string, to: string) =>
    request<GraphData>(`/graphs/${id}/data?${new URLSearchParams({ from, to }).toString()}`),

  getSynthesisConfig: () => request<SynthesisConfig>("/synthesis-config"),
  setSynthesisConfig: (input: SynthesisConfig) =>
    request<SynthesisConfig>("/synthesis-config", { method: "PUT", body: JSON.stringify(input) }),

  getSynthesisRange: (from: string, to: string) =>
    request<DailySynthesis[]>(`/synthesis?${new URLSearchParams({ from, to }).toString()}`),
  getSeasonSynthesis: (seasonId: string) => request<SeasonSynthesis>(`/synthesis/seasons/${seasonId}`),
  runSynthesis: (from: string, to: string) =>
    request<{ daysProcessed: number }>("/synthesis/run", { method: "POST", body: JSON.stringify({ from, to }) }),
};
