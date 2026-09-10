import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  type DailySynthesis,
  type Season,
  type SeasonSynthesis,
  type Sensor,
  type SiloEvent,
  type SynthesisConfig,
} from "../lib/api";
import type { Dictionary } from "../locales/en";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const emptySeasonForm = { label: "", startDate: "", endDate: "" };
const emptySiloEventForm = { occurredAt: todayIso(), quantityKg: "", note: "" };
const emptyConfig: SynthesisConfig = {
  outdoorTempSensorId: null,
  augerRunSensorId: null,
  augerPauseSensorId: null,
  burnerCycleSensorId: null,
  pelletWeightPerMinuteGrams: 0,
  referenceTempC: 18,
  houseSurfaceM2: 0,
};

function fmt(value: number | null): string {
  return value === null ? "—" : String(value);
}

function SensorRoleSelect({
  value,
  onChange,
  sensors,
  t,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  sensors: Sensor[];
  t: Dictionary;
}) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{t.synthesis.roleNone}</option>
      {sensors.map((sensor) => (
        <option key={sensor.id} value={sensor.id}>
          {sensor.label}
        </option>
      ))}
    </select>
  );
}

export function SynthesisPage({ t, isAdmin }: { t: Dictionary; isAdmin: boolean }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [mode, setMode] = useState<"season" | "range">("season");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [range, setRange] = useState(defaultRange);
  const [seasonData, setSeasonData] = useState<SeasonSynthesis | null>(null);
  const [rangeData, setRangeData] = useState<DailySynthesis[] | null>(null);

  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [config, setConfig] = useState<SynthesisConfig>(emptyConfig);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const [seasonEditingId, setSeasonEditingId] = useState<string | null>(null);
  const [seasonForm, setSeasonForm] = useState(emptySeasonForm);
  const [seasonFormError, setSeasonFormError] = useState<string | null>(null);

  const [siloEvents, setSiloEvents] = useState<SiloEvent[]>([]);
  const [siloEditingId, setSiloEditingId] = useState<string | null>(null);
  const [siloForm, setSiloForm] = useState(emptySiloEventForm);
  const [siloFormError, setSiloFormError] = useState<string | null>(null);

  const [runRange, setRunRange] = useState(defaultRange);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  function loadSeasons() {
    api.listSeasons().then((list) => {
      setSeasons(list);
      if (!selectedSeasonId && list.length > 0) setSelectedSeasonId(list[0].id);
    });
  }

  function loadSiloEvents() {
    api.listSiloEvents().then(setSiloEvents);
  }

  useEffect(() => {
    loadSeasons();
    api.listSensors().then(setSensors);
    if (isAdmin) {
      api.getSynthesisConfig().then(setConfig);
      loadSiloEvents();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (mode !== "season" || !selectedSeasonId) {
      setSeasonData(null);
      return;
    }
    api.getSeasonSynthesis(selectedSeasonId).then(setSeasonData);
  }, [mode, selectedSeasonId]);

  useEffect(() => {
    if (mode !== "range") {
      setRangeData(null);
      return;
    }
    api.getSynthesisRange(range.from, range.to).then(setRangeData);
  }, [mode, range.from, range.to]);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    const saved = await api.setSynthesisConfig(config);
    setConfig(saved);
    setConfigMessage(t.synthesis.configSaved);
  }

  function startAddSeason() {
    setSeasonEditingId("new");
    setSeasonForm(emptySeasonForm);
    setSeasonFormError(null);
  }

  function startEditSeason(season: Season) {
    setSeasonEditingId(season.id);
    setSeasonForm({ label: season.label, startDate: season.startDate.slice(0, 10), endDate: season.endDate.slice(0, 10) });
    setSeasonFormError(null);
  }

  async function submitSeasonForm(event: FormEvent) {
    event.preventDefault();
    setSeasonFormError(null);
    try {
      if (seasonEditingId === "new") {
        await api.createSeason(seasonForm);
      } else if (seasonEditingId) {
        await api.updateSeason(seasonEditingId, seasonForm);
      }
      setSeasonEditingId(null);
      loadSeasons();
    } catch (err) {
      setSeasonFormError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function removeSeason(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    await api.deleteSeason(id);
    if (selectedSeasonId === id) setSelectedSeasonId("");
    loadSeasons();
  }

  function startAddSiloEvent() {
    setSiloEditingId("new");
    setSiloForm(emptySiloEventForm);
    setSiloFormError(null);
  }

  function startEditSiloEvent(event: SiloEvent) {
    setSiloEditingId(event.id);
    setSiloForm({ occurredAt: event.occurredAt.slice(0, 10), quantityKg: String(event.quantityKg), note: event.note ?? "" });
    setSiloFormError(null);
  }

  async function submitSiloForm(event: FormEvent) {
    event.preventDefault();
    setSiloFormError(null);
    const input = { occurredAt: siloForm.occurredAt, quantityKg: Number(siloForm.quantityKg) || 0, note: siloForm.note || undefined };
    try {
      if (siloEditingId === "new") {
        await api.createSiloEvent(input);
      } else if (siloEditingId) {
        await api.updateSiloEvent(siloEditingId, input);
      }
      setSiloEditingId(null);
      loadSiloEvents();
    } catch (err) {
      setSiloFormError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function removeSiloEvent(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    await api.deleteSiloEvent(id);
    loadSiloEvents();
  }

  async function runNow() {
    setRunMessage(null);
    setRunError(null);
    try {
      const result = await api.runSynthesis(runRange.from, runRange.to);
      setRunMessage(t.synthesis.runResult.replace("{days}", String(result.daysProcessed)));
      if (mode === "season" && selectedSeasonId) api.getSeasonSynthesis(selectedSeasonId).then(setSeasonData);
      if (mode === "range") api.getSynthesisRange(range.from, range.to).then(setRangeData);
    } catch (err) {
      setRunError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <section className="page-section">
      <div className="panel">
        <h2>{t.synthesis.title}</h2>
        <div className="filter-bar">
          <label>
            {t.synthesis.mode}
            <select value={mode} onChange={(e) => setMode(e.target.value as "season" | "range")}>
              <option value="season">{t.synthesis.modeSeason}</option>
              <option value="range">{t.synthesis.modeRange}</option>
            </select>
          </label>
          {mode === "season" ? (
            <label>
              {t.synthesis.season}
              <select value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                {t.history.from}
                <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
              </label>
              <label>
                {t.history.to}
                <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
              </label>
            </>
          )}
        </div>

        {mode === "season" && seasons.length === 0 && <p>{t.synthesis.noSeasons}</p>}

        {mode === "season" && seasonData && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.synthesis.month}</th>
                  <th>{t.synthesis.tcExtMax}</th>
                  <th>{t.synthesis.tcExtMin}</th>
                  <th>{t.synthesis.conso}</th>
                  <th>{t.synthesis.dju}</th>
                  <th>{t.synthesis.nbCycle}</th>
                  <th>{t.synthesis.efficiency}</th>
                </tr>
              </thead>
              <tbody>
                {seasonData.months.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td>{fmt(m.tcExtMax)}</td>
                    <td>{fmt(m.tcExtMin)}</td>
                    <td>{fmt(m.consoKg)}</td>
                    <td>{fmt(m.dju)}</td>
                    <td>{fmt(m.nbCycle)}</td>
                    <td>{fmt(m.efficiencyGPerDjuM2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {mode === "range" && rangeData && rangeData.length === 0 && <p>{t.synthesis.noData}</p>}

        {mode === "range" && rangeData && rangeData.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.synthesis.day}</th>
                  <th>{t.synthesis.tcExtMax}</th>
                  <th>{t.synthesis.tcExtMin}</th>
                  <th>{t.synthesis.conso}</th>
                  <th>{t.synthesis.dju}</th>
                  <th>{t.synthesis.nbCycle}</th>
                </tr>
              </thead>
              <tbody>
                {rangeData.map((row) => (
                  <tr key={row.day}>
                    <td>{row.day}</td>
                    <td>{fmt(row.tcExtMax)}</td>
                    <td>{fmt(row.tcExtMin)}</td>
                    <td>{fmt(row.consoKg)}</td>
                    <td>{fmt(row.dju)}</td>
                    <td>{fmt(row.nbCycle)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="panel">
            <h2>{t.synthesis.runTitle}</h2>
            <div className="filter-bar">
              <label>
                {t.history.from}
                <input type="date" value={runRange.from} onChange={(e) => setRunRange({ ...runRange, from: e.target.value })} />
              </label>
              <label>
                {t.history.to}
                <input type="date" value={runRange.to} onChange={(e) => setRunRange({ ...runRange, to: e.target.value })} />
              </label>
              <button type="button" onClick={runNow}>
                {t.synthesis.runNow}
              </button>
            </div>
            {runMessage && <p className="field-hint">{runMessage}</p>}
            {runError && (
              <p className="login-error" role="alert">
                {runError}
              </p>
            )}
          </div>

          <div className="panel">
            <h2>{t.synthesis.configTitle}</h2>
            <form className="sensor-form" onSubmit={saveConfig}>
              <label>
                {t.synthesis.outdoorTempSensor}
                <SensorRoleSelect value={config.outdoorTempSensorId} onChange={(v) => setConfig({ ...config, outdoorTempSensorId: v })} sensors={sensors} t={t} />
              </label>
              <label>
                {t.synthesis.augerRunSensor}
                <SensorRoleSelect value={config.augerRunSensorId} onChange={(v) => setConfig({ ...config, augerRunSensorId: v })} sensors={sensors} t={t} />
              </label>
              <label>
                {t.synthesis.augerPauseSensor}
                <SensorRoleSelect value={config.augerPauseSensorId} onChange={(v) => setConfig({ ...config, augerPauseSensorId: v })} sensors={sensors} t={t} />
              </label>
              <label>
                {t.synthesis.burnerCycleSensor}
                <SensorRoleSelect value={config.burnerCycleSensorId} onChange={(v) => setConfig({ ...config, burnerCycleSensorId: v })} sensors={sensors} t={t} />
              </label>
              <label>
                {t.synthesis.pelletWeightPerMinute}
                <input
                  type="number"
                  step="any"
                  value={config.pelletWeightPerMinuteGrams}
                  onChange={(e) => setConfig({ ...config, pelletWeightPerMinuteGrams: Number(e.target.value) || 0 })}
                />
              </label>
              <label>
                {t.synthesis.referenceTemp}
                <input
                  type="number"
                  step="any"
                  value={config.referenceTempC}
                  onChange={(e) => setConfig({ ...config, referenceTempC: Number(e.target.value) || 0 })}
                />
              </label>
              <label>
                {t.synthesis.houseSurface}
                <input
                  type="number"
                  step="any"
                  value={config.houseSurfaceM2}
                  onChange={(e) => setConfig({ ...config, houseSurfaceM2: Number(e.target.value) || 0 })}
                />
              </label>
              <p className="field-hint">{t.synthesis.configHint}</p>
              <button type="submit">{t.sensors.save}</button>
              {configMessage && <p className="field-hint">{configMessage}</p>}
            </form>
          </div>

          <div className="panel">
            <h2>{t.synthesis.seasonsTitle}</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.sensors.label}</th>
                    <th>{t.history.from}</th>
                    <th>{t.history.to}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((season) => (
                    <tr key={season.id}>
                      <td>{season.label}</td>
                      <td>{season.startDate.slice(0, 10)}</td>
                      <td>{season.endDate.slice(0, 10)}</td>
                      <td className="row-actions">
                        <button type="button" onClick={() => startEditSeason(season)}>
                          {t.sensors.edit}
                        </button>
                        <button type="button" onClick={() => removeSeason(season.id)}>
                          {t.sensors.delete}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {seasonEditingId === null ? (
              <button type="button" onClick={startAddSeason}>
                {t.synthesis.seasonAdd}
              </button>
            ) : (
              <form className="sensor-form" onSubmit={submitSeasonForm}>
                <label>
                  {t.sensors.label}
                  <input value={seasonForm.label} onChange={(e) => setSeasonForm({ ...seasonForm, label: e.target.value })} required />
                </label>
                <label>
                  {t.history.from}
                  <input type="date" value={seasonForm.startDate} onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })} required />
                </label>
                <label>
                  {t.history.to}
                  <input type="date" value={seasonForm.endDate} onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })} required />
                </label>
                {seasonFormError && (
                  <p className="login-error" role="alert">
                    {seasonFormError}
                  </p>
                )}
                <div className="row-actions">
                  <button type="submit">{t.sensors.save}</button>
                  <button type="button" onClick={() => setSeasonEditingId(null)}>
                    {t.sensors.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="panel">
            <h2>{t.synthesis.siloEventsTitle}</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.history.timestamp}</th>
                    <th>{t.synthesis.quantityKg}</th>
                    <th>{t.synthesis.note}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {siloEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.occurredAt.slice(0, 10)}</td>
                      <td>{event.quantityKg}</td>
                      <td>{event.note ?? "—"}</td>
                      <td className="row-actions">
                        <button type="button" onClick={() => startEditSiloEvent(event)}>
                          {t.sensors.edit}
                        </button>
                        <button type="button" onClick={() => removeSiloEvent(event.id)}>
                          {t.sensors.delete}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {siloEditingId === null ? (
              <button type="button" onClick={startAddSiloEvent}>
                {t.synthesis.siloEventAdd}
              </button>
            ) : (
              <form className="sensor-form" onSubmit={submitSiloForm}>
                <label>
                  {t.history.timestamp}
                  <input type="date" value={siloForm.occurredAt} onChange={(e) => setSiloForm({ ...siloForm, occurredAt: e.target.value })} required />
                </label>
                <label>
                  {t.synthesis.quantityKg}
                  <input type="number" step="any" value={siloForm.quantityKg} onChange={(e) => setSiloForm({ ...siloForm, quantityKg: e.target.value })} required />
                </label>
                <label>
                  {t.synthesis.note}
                  <input value={siloForm.note} onChange={(e) => setSiloForm({ ...siloForm, note: e.target.value })} />
                </label>
                {siloFormError && (
                  <p className="login-error" role="alert">
                    {siloFormError}
                  </p>
                )}
                <div className="row-actions">
                  <button type="submit">{t.sensors.save}</button>
                  <button type="button" onClick={() => setSiloEditingId(null)}>
                    {t.sensors.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </section>
  );
}
