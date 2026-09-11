import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type LiveTag, type Sensor, type SchedulerRun } from "../lib/api";
import { formatDateTime, type Language } from "../hooks/useLocale";
import type { Dictionary } from "../locales/en";

type SensorFormState = {
  key: string;
  label: string;
  unit: string;
  correction: string;
  csvColumn: string;
};

const emptyForm: SensorFormState = { key: "", label: "", unit: "", correction: "0", csvColumn: "" };

type LiveTagFormState = {
  key: string;
  label: string;
  tag: string;
  writable: boolean;
  divisor: string;
  unit: string;
  minValue: string;
  maxValue: string;
};

const emptyLiveTagForm: LiveTagFormState = {
  key: "",
  label: "",
  tag: "",
  writable: false,
  divisor: "1",
  unit: "",
  minValue: "",
  maxValue: "",
};

export function SensorsPage({ t, language }: { t: Dictionary; language: Language }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SensorFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [runs, setRuns] = useState<SchedulerRun[]>([]);

  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [liveTags, setLiveTags] = useState<LiveTag[]>([]);
  const [editingLiveTagId, setEditingLiveTagId] = useState<string | null>(null);
  const [liveTagForm, setLiveTagForm] = useState<LiveTagFormState>(emptyLiveTagForm);
  const [liveTagFormError, setLiveTagFormError] = useState<string | null>(null);

  function loadSensors() {
    api.listSensors().then(setSensors);
  }

  function loadRuns() {
    api.listSchedulerRuns().then(setRuns);
  }

  function loadLiveTags() {
    api.listLiveTags().then(setLiveTags);
  }

  useEffect(() => {
    loadSensors();
    loadRuns();
    loadLiveTags();
    api.getBoilerConnection().then((connection) => {
      if (connection.configured) {
        setHost(connection.host);
        setUsername(connection.username ?? "");
        setHasCredentials(connection.hasCredentials);
      }
    });
  }, []);

  function startAdd() {
    setEditingId("new");
    setForm(emptyForm);
    setFormError(null);
  }

  function startEdit(sensor: Sensor) {
    setEditingId(sensor.id);
    setForm({
      key: sensor.key,
      label: sensor.label,
      unit: sensor.unit ?? "",
      correction: String(sensor.correction),
      csvColumn: sensor.csvColumn === null ? "" : String(sensor.csvColumn),
    });
    setFormError(null);
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const input = {
      key: form.key,
      label: form.label,
      unit: form.unit || undefined,
      correction: Number(form.correction) || 0,
      csvColumn: form.csvColumn === "" ? undefined : Number(form.csvColumn),
    };
    try {
      if (editingId === "new") {
        await api.createSensor(input);
      } else if (editingId) {
        await api.updateSensor(editingId, input);
      }
      setEditingId(null);
      loadSensors();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function removeSensor(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    await api.deleteSensor(id);
    loadSensors();
  }

  async function importFromBoiler() {
    setImportMessage(null);
    setImportError(null);
    try {
      const result = await api.importSensorsFromBoiler();
      setImportMessage(
        t.sensors.importResult.replace("{created}", String(result.created)).replace("{skipped}", String(result.skipped)),
      );
      loadSensors();
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function saveConnection(event: FormEvent) {
    event.preventDefault();
    const connection = await api.setBoilerConnection(host, username || undefined, password || undefined);
    setPassword("");
    if (connection.configured) setHasCredentials(connection.hasCredentials);
    setConnectionMessage(t.sensors.connectionSaved);
  }

  async function runIngest() {
    setIngestMessage(null);
    setIngestError(null);
    try {
      const result = await api.runBoilerIngest();
      setIngestMessage(
        t.sensors.runIngestResult.replace("{dates}", String(result.datesConsidered)).replace("{readings}", String(result.readingsWritten)),
      );
      loadRuns();
    } catch (err) {
      setIngestError(err instanceof ApiError ? err.message : String(err));
    }
  }

  function startAddLiveTag() {
    setEditingLiveTagId("new");
    setLiveTagForm(emptyLiveTagForm);
    setLiveTagFormError(null);
  }

  function startEditLiveTag(liveTag: LiveTag) {
    setEditingLiveTagId(liveTag.id);
    setLiveTagForm({
      key: liveTag.key,
      label: liveTag.label,
      tag: liveTag.tag,
      writable: liveTag.writable,
      divisor: String(liveTag.divisor),
      unit: liveTag.unit ?? "",
      minValue: liveTag.minValue === null ? "" : String(liveTag.minValue),
      maxValue: liveTag.maxValue === null ? "" : String(liveTag.maxValue),
    });
    setLiveTagFormError(null);
  }

  async function submitLiveTagForm(event: FormEvent) {
    event.preventDefault();
    setLiveTagFormError(null);
    const input = {
      key: liveTagForm.key,
      label: liveTagForm.label,
      tag: liveTagForm.tag,
      writable: liveTagForm.writable,
      divisor: Number(liveTagForm.divisor) || 1,
      unit: liveTagForm.unit || undefined,
      minValue: liveTagForm.minValue === "" ? undefined : Number(liveTagForm.minValue),
      maxValue: liveTagForm.maxValue === "" ? undefined : Number(liveTagForm.maxValue),
    };
    try {
      if (editingLiveTagId === "new") {
        await api.createLiveTag(input);
      } else if (editingLiveTagId) {
        await api.updateLiveTag(editingLiveTagId, input);
      }
      setEditingLiveTagId(null);
      loadLiveTags();
    } catch (err) {
      setLiveTagFormError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function removeLiveTag(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    await api.deleteLiveTag(id);
    loadLiveTags();
  }

  return (
    <div className="ls-page-wide" style={{ width: "100%" }}>
      <div className="ls-panel">
        <h2 className="ls-panel-title">{t.sensors.boilerConnectionTitle}</h2>
        <form onSubmit={saveConnection}>
          <div className="ls-form-grid">
            <label className="ls-field">
              <span className="ls-field-label">{t.sensors.boilerHost}</span>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.50" />
            </label>
            <label className="ls-field">
              <span className="ls-field-label">{t.sensors.boilerUsername}</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="ls-field">
              <span className="ls-field-label">{t.sensors.boilerPassword}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasCredentials ? t.sensors.boilerPasswordUnchanged : ""}
              />
            </label>
          </div>
          <button type="submit" className="ls-btn ls-btn-primary">
            {t.sensors.saveConnection}
          </button>
        </form>
        <p className="ls-hint">{t.sensors.boilerHostHint}</p>
        <p className="ls-hint">{t.sensors.boilerCredentialsHint}</p>
        {connectionMessage && <p className="ls-hint">{connectionMessage}</p>}

        <button type="button" className="ls-btn" onClick={runIngest}>
          {t.sensors.runIngestNow}
        </button>
        {ingestMessage && <p className="ls-hint">{ingestMessage}</p>}
        {ingestError && (
          <p className="ls-error" role="alert">
            {ingestError}
          </p>
        )}

        <h3 className="ls-panel-subtitle">{t.sensors.recentRuns}</h3>
        {runs.length === 0 ? (
          <p className="ls-empty">{t.sensors.noRuns}</p>
        ) : (
          <div className="ls-table-wrap">
            <table className="ls-table">
              <thead>
                <tr>
                  <th>{t.sensors.runJob}</th>
                  <th>{t.sensors.runStatus}</th>
                  <th>{t.sensors.runStarted}</th>
                  <th>{t.sensors.runError}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.job}</td>
                    <td>{run.status}</td>
                    <td>{formatDateTime(run.startedAt, language)}</td>
                    <td>{run.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ls-panel">
        <h2 className="ls-panel-title">{t.sensors.title}</h2>
        <div className="ls-table-wrap">
          <table className="ls-table">
            <thead>
              <tr>
                <th>{t.sensors.key}</th>
                <th>{t.sensors.label}</th>
                <th>{t.sensors.unit}</th>
                <th>{t.sensors.correction}</th>
                <th>{t.sensors.csvColumn}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor) => (
                <tr key={sensor.id}>
                  <td>{sensor.key}</td>
                  <td>{sensor.label}</td>
                  <td>{sensor.unit ?? "—"}</td>
                  <td>{sensor.correction}</td>
                  <td>{sensor.csvColumn ?? "—"}</td>
                  <td>
                    <span className="ls-btn-row">
                      <button type="button" className="ls-text-action" onClick={() => startEdit(sensor)}>
                        {t.sensors.edit}
                      </button>
                      <button type="button" className="ls-text-action ls-text-action--danger" onClick={() => removeSensor(sensor.id)}>
                        {t.sensors.delete}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {importMessage && <p className="ls-hint">{importMessage}</p>}
        {importError && (
          <p className="ls-error" role="alert">
            {importError}
          </p>
        )}

        {editingId === null ? (
          <div className="ls-btn-row">
            <button type="button" className="ls-btn ls-btn-primary" onClick={startAdd}>
              {t.sensors.add}
            </button>
            <button type="button" className="ls-btn" onClick={importFromBoiler}>
              {t.sensors.importFromBoiler}
            </button>
          </div>
        ) : (
          <form onSubmit={submitForm}>
            <div className="ls-form-grid">
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.key}</span>
                <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.label}</span>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.unit}</span>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.correction}</span>
                <input type="number" step="any" value={form.correction} onChange={(e) => setForm({ ...form, correction: e.target.value })} />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.csvColumn}</span>
                <input type="number" min="0" value={form.csvColumn} onChange={(e) => setForm({ ...form, csvColumn: e.target.value })} />
              </label>
            </div>
            <p className="ls-hint">{t.sensors.csvColumnHint}</p>
            {formError && (
              <p className="ls-error" role="alert">
                {formError}
              </p>
            )}
            <div className="ls-btn-row">
              <button type="submit" className="ls-btn ls-btn-primary">
                {t.sensors.save}
              </button>
              <button type="button" className="ls-text-action" onClick={() => setEditingId(null)}>
                {t.sensors.cancel}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="ls-panel">
        <h2 className="ls-panel-title">{t.sensors.liveTagsTitle}</h2>
        <div className="ls-table-wrap">
          <table className="ls-table">
            <thead>
              <tr>
                <th>{t.sensors.key}</th>
                <th>{t.sensors.label}</th>
                <th>{t.sensors.liveTagPath}</th>
                <th>{t.sensors.liveTagWritable}</th>
                <th>{t.sensors.liveTagDivisor}</th>
                <th>{t.sensors.unit}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liveTags.map((liveTag) => (
                <tr key={liveTag.id}>
                  <td>{liveTag.key}</td>
                  <td>{liveTag.label}</td>
                  <td className="ls-table-mono">{liveTag.tag}</td>
                  <td>{liveTag.writable ? "✓" : "—"}</td>
                  <td>{liveTag.divisor}</td>
                  <td>{liveTag.unit ?? "—"}</td>
                  <td>
                    <span className="ls-btn-row">
                      <button type="button" className="ls-text-action" onClick={() => startEditLiveTag(liveTag)}>
                        {t.sensors.edit}
                      </button>
                      <button type="button" className="ls-text-action ls-text-action--danger" onClick={() => removeLiveTag(liveTag.id)}>
                        {t.sensors.delete}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingLiveTagId === null ? (
          <button type="button" className="ls-btn ls-btn-primary" onClick={startAddLiveTag}>
            {t.sensors.liveTagAdd}
          </button>
        ) : (
          <form onSubmit={submitLiveTagForm}>
            <div className="ls-form-grid">
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.key}</span>
                <input value={liveTagForm.key} onChange={(e) => setLiveTagForm({ ...liveTagForm, key: e.target.value })} required />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.label}</span>
                <input value={liveTagForm.label} onChange={(e) => setLiveTagForm({ ...liveTagForm, label: e.target.value })} required />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.liveTagPath}</span>
                <input
                  value={liveTagForm.tag}
                  onChange={(e) => setLiveTagForm({ ...liveTagForm, tag: e.target.value })}
                  placeholder="CAPPL:LOCAL.oekomode"
                  required
                />
              </label>
              <label className="ls-field ls-field--checkbox">
                <input
                  type="checkbox"
                  checked={liveTagForm.writable}
                  onChange={(e) => setLiveTagForm({ ...liveTagForm, writable: e.target.checked })}
                />
                <span className="ls-field-label" style={{ margin: 0 }}>
                  {t.sensors.liveTagWritable}
                </span>
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.liveTagDivisor}</span>
                <input
                  type="number"
                  step="any"
                  value={liveTagForm.divisor}
                  onChange={(e) => setLiveTagForm({ ...liveTagForm, divisor: e.target.value })}
                />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.unit}</span>
                <input value={liveTagForm.unit} onChange={(e) => setLiveTagForm({ ...liveTagForm, unit: e.target.value })} />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.liveTagMin}</span>
                <input
                  type="number"
                  step="any"
                  value={liveTagForm.minValue}
                  onChange={(e) => setLiveTagForm({ ...liveTagForm, minValue: e.target.value })}
                />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.sensors.liveTagMax}</span>
                <input
                  type="number"
                  step="any"
                  value={liveTagForm.maxValue}
                  onChange={(e) => setLiveTagForm({ ...liveTagForm, maxValue: e.target.value })}
                />
              </label>
            </div>
            <p className="ls-hint">{t.sensors.liveTagHint}</p>
            <p className="ls-hint">{t.sensors.liveTagBoundsHint}</p>
            {liveTagFormError && (
              <p className="ls-error" role="alert">
                {liveTagFormError}
              </p>
            )}
            <div className="ls-btn-row">
              <button type="submit" className="ls-btn ls-btn-primary">
                {t.sensors.save}
              </button>
              <button type="button" className="ls-text-action" onClick={() => setEditingLiveTagId(null)}>
                {t.sensors.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
