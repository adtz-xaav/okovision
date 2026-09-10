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
    <div className="ls-page-wide" style={{ width: "100%" }}>
      <div className="ls-panel">
        <h2 className="ls-panel-title">{t.synthesis.title}</h2>
        <div className="ls-form-grid">
          <label className="ls-field">
            <span className="ls-field-label">{t.synthesis.mode}</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as "season" | "range")}>
              <option value="season">{t.synthesis.modeSeason}</option>
              <option value="range">{t.synthesis.modeRange}</option>
            </select>
          </label>
          {mode === "season" ? (
            <label className="ls-field">
              <span className="ls-field-label">{t.synthesis.season}</span>
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
              <label className="ls-field">
                <span className="ls-field-label">{t.history.from}</span>
                <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.history.to}</span>
                <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
              </label>
            </>
          )}
        </div>

        {mode === "season" && seasons.length === 0 && <p className="ls-empty">{t.synthesis.noSeasons}</p>}

        {mode === "season" && seasonData && (
          <div className="ls-table-wrap">
            <table className="ls-table">
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

        {mode === "range" && rangeData && rangeData.length === 0 && <p className="ls-empty">{t.synthesis.noData}</p>}

        {mode === "range" && rangeData && rangeData.length > 0 && (
          <div className="ls-table-wrap">
            <table className="ls-table">
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
          <div className="ls-panel">
            <h2 className="ls-panel-title">{t.synthesis.runTitle}</h2>
            <div className="ls-form-grid" style={{ alignItems: "flex-end" }}>
              <label className="ls-field">
                <span className="ls-field-label">{t.history.from}</span>
                <input type="date" value={runRange.from} onChange={(e) => setRunRange({ ...runRange, from: e.target.value })} />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.history.to}</span>
                <input type="date" value={runRange.to} onChange={(e) => setRunRange({ ...runRange, to: e.target.value })} />
              </label>
              <button type="button" className="ls-btn ls-btn-primary" onClick={runNow}>
                {t.synthesis.runNow}
              </button>
            </div>
            {runMessage && <p className="ls-hint">{runMessage}</p>}
            {runError && (
              <p className="ls-error" role="alert">
                {runError}
              </p>
            )}
          </div>

          <div className="ls-panel">
            <h2 className="ls-panel-title">{t.synthesis.configTitle}</h2>
            <form onSubmit={saveConfig}>
              <div className="ls-form-grid">
                <label className="ls-field">
                  <span className="ls-field-label">{t.synthesis.outdoorTempSensor}</span>
                  <SensorRoleSelect value={config.outdoorTempSensorId} onChange={(v) => setConfig({ ...config, outdoorTempSensorId: v })} sensors={sensors} t={t} />
                </label>
                <label className="ls-field">
                  <span className="ls-field-label">{t.synthesis.augerRunSensor}</span>
                  <SensorRoleSelect value={config.augerRunSensorId} onChange={(v) => setConfig({ ...config, augerRunSensorId: v })} sensors={sensors} t={t} />
                </label>
                <label className="ls-field">
                  <span className="ls-field-label">{t.synthesis.augerPauseSensor}</span>
                  <SensorRoleSelect value={config.augerPauseSensorId} onChange={(v) => setConfig({ ...config, augerPauseSensorId: v })} sensors={sensors} t={t} />
                </label>
                <label className="ls-field">
                  <span className="ls-field-label">{t.synthesis.burnerCycleSensor}</span>
                  <SensorRoleSelect value={config.burnerCycleSensorId} onChange={(v) => setConfig({ ...config, burnerCycleSensorId: v })} sensors={sensors} t={t} />
                </label>
                <label className="ls-field">
                  <span className="ls-field-label">{t.synthesis.pelletWeightPerMinute}</span>
                  <input
                    type="number"
                    step="any"
                    value={config.pelletWeightPerMinuteGrams}
                    onChange={(e) => setConfig({ ...config, pelletWeightPerMinuteGrams: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="ls-field">
                  <span className="ls-field-label">{t.synthesis.referenceTemp}</span>
                  <input
                    type="number"
                    step="any"
                    value={config.referenceTempC}
                    onChange={(e) => setConfig({ ...config, referenceTempC: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="ls-field">
                  <span className="ls-field-label">{t.synthesis.houseSurface}</span>
                  <input
                    type="number"
                    step="any"
                    value={config.houseSurfaceM2}
                    onChange={(e) => setConfig({ ...config, houseSurfaceM2: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>
              <p className="ls-hint">{t.synthesis.configHint}</p>
              <button type="submit" className="ls-btn ls-btn-primary">
                {t.sensors.save}
              </button>
              {configMessage && <p className="ls-hint">{configMessage}</p>}
            </form>
          </div>

          <div className="ls-panel">
            <h2 className="ls-panel-title">{t.synthesis.seasonsTitle}</h2>
            <div className="ls-table-wrap">
              <table className="ls-table">
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
                      <td>
                        <span className="ls-btn-row">
                          <button type="button" className="ls-text-action" onClick={() => startEditSeason(season)}>
                            {t.sensors.edit}
                          </button>
                          <button type="button" className="ls-text-action ls-text-action--danger" onClick={() => removeSeason(season.id)}>
                            {t.sensors.delete}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {seasonEditingId === null ? (
              <button type="button" className="ls-btn ls-btn-primary" onClick={startAddSeason}>
                {t.synthesis.seasonAdd}
              </button>
            ) : (
              <form onSubmit={submitSeasonForm}>
                <div className="ls-form-grid">
                  <label className="ls-field">
                    <span className="ls-field-label">{t.sensors.label}</span>
                    <input value={seasonForm.label} onChange={(e) => setSeasonForm({ ...seasonForm, label: e.target.value })} required />
                  </label>
                  <label className="ls-field">
                    <span className="ls-field-label">{t.history.from}</span>
                    <input type="date" value={seasonForm.startDate} onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })} required />
                  </label>
                  <label className="ls-field">
                    <span className="ls-field-label">{t.history.to}</span>
                    <input type="date" value={seasonForm.endDate} onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })} required />
                  </label>
                </div>
                {seasonFormError && (
                  <p className="ls-error" role="alert">
                    {seasonFormError}
                  </p>
                )}
                <div className="ls-btn-row">
                  <button type="submit" className="ls-btn ls-btn-primary">
                    {t.sensors.save}
                  </button>
                  <button type="button" className="ls-text-action" onClick={() => setSeasonEditingId(null)}>
                    {t.sensors.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="ls-panel">
            <h2 className="ls-panel-title">{t.synthesis.siloEventsTitle}</h2>
            <div className="ls-table-wrap">
              <table className="ls-table">
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
                      <td>
                        <span className="ls-btn-row">
                          <button type="button" className="ls-text-action" onClick={() => startEditSiloEvent(event)}>
                            {t.sensors.edit}
                          </button>
                          <button type="button" className="ls-text-action ls-text-action--danger" onClick={() => removeSiloEvent(event.id)}>
                            {t.sensors.delete}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {siloEditingId === null ? (
              <button type="button" className="ls-btn ls-btn-primary" onClick={startAddSiloEvent}>
                {t.synthesis.siloEventAdd}
              </button>
            ) : (
              <form onSubmit={submitSiloForm}>
                <div className="ls-form-grid">
                  <label className="ls-field">
                    <span className="ls-field-label">{t.history.timestamp}</span>
                    <input type="date" value={siloForm.occurredAt} onChange={(e) => setSiloForm({ ...siloForm, occurredAt: e.target.value })} required />
                  </label>
                  <label className="ls-field">
                    <span className="ls-field-label">{t.synthesis.quantityKg}</span>
                    <input type="number" step="any" value={siloForm.quantityKg} onChange={(e) => setSiloForm({ ...siloForm, quantityKg: e.target.value })} required />
                  </label>
                  <label className="ls-field">
                    <span className="ls-field-label">{t.synthesis.note}</span>
                    <input value={siloForm.note} onChange={(e) => setSiloForm({ ...siloForm, note: e.target.value })} />
                  </label>
                </div>
                {siloFormError && (
                  <p className="ls-error" role="alert">
                    {siloFormError}
                  </p>
                )}
                <div className="ls-btn-row">
                  <button type="submit" className="ls-btn ls-btn-primary">
                    {t.sensors.save}
                  </button>
                  <button type="button" className="ls-text-action" onClick={() => setSiloEditingId(null)}>
                    {t.sensors.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
