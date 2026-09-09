import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Sensor, type SchedulerRun } from "../lib/api";
import type { Dictionary } from "../locales/en";

type SensorFormState = {
  key: string;
  label: string;
  unit: string;
  correction: string;
  csvColumn: string;
};

const emptyForm: SensorFormState = { key: "", label: "", unit: "", correction: "0", csvColumn: "" };

export function SensorsPage({ t }: { t: Dictionary }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SensorFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [host, setHost] = useState("");
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [runs, setRuns] = useState<SchedulerRun[]>([]);

  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function loadSensors() {
    api.listSensors().then(setSensors);
  }

  function loadRuns() {
    api.listSchedulerRuns().then(setRuns);
  }

  useEffect(() => {
    loadSensors();
    loadRuns();
    api.getBoilerConnection().then((connection) => {
      if ("host" in connection) setHost(connection.host);
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
    await api.setBoilerConnection(host);
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

  return (
    <section className="page-section">
      <div className="panel">
        <h2>{t.sensors.boilerConnectionTitle}</h2>
        <form className="inline-form" onSubmit={saveConnection}>
          <label>
            {t.sensors.boilerHost}
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.50" />
          </label>
          <button type="submit">{t.sensors.saveConnection}</button>
        </form>
        <p className="field-hint">{t.sensors.boilerHostHint}</p>
        {connectionMessage && <p className="field-hint">{connectionMessage}</p>}

        <button type="button" onClick={runIngest}>
          {t.sensors.runIngestNow}
        </button>
        {ingestMessage && <p className="field-hint">{ingestMessage}</p>}
        {ingestError && (
          <p className="login-error" role="alert">
            {ingestError}
          </p>
        )}

        <h3>{t.sensors.recentRuns}</h3>
        {runs.length === 0 ? (
          <p>{t.sensors.noRuns}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.job}</td>
                    <td>{run.status}</td>
                    <td>{new Date(run.startedAt).toLocaleString()}</td>
                    <td>{run.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>{t.sensors.title}</h2>
        <div className="table-scroll">
          <table>
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
                  <td className="row-actions">
                    <button type="button" onClick={() => startEdit(sensor)}>
                      {t.sensors.edit}
                    </button>
                    <button type="button" onClick={() => removeSensor(sensor.id)}>
                      {t.sensors.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {importMessage && <p className="field-hint">{importMessage}</p>}
        {importError && (
          <p className="login-error" role="alert">
            {importError}
          </p>
        )}

        {editingId === null ? (
          <div className="row-actions">
            <button type="button" onClick={startAdd}>
              {t.sensors.add}
            </button>
            <button type="button" onClick={importFromBoiler}>
              {t.sensors.importFromBoiler}
            </button>
          </div>
        ) : (
          <form className="sensor-form" onSubmit={submitForm}>
            <label>
              {t.sensors.key}
              <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
            </label>
            <label>
              {t.sensors.label}
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
            </label>
            <label>
              {t.sensors.unit}
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </label>
            <label>
              {t.sensors.correction}
              <input type="number" step="any" value={form.correction} onChange={(e) => setForm({ ...form, correction: e.target.value })} />
            </label>
            <label>
              {t.sensors.csvColumn}
              <input type="number" min="0" value={form.csvColumn} onChange={(e) => setForm({ ...form, csvColumn: e.target.value })} />
            </label>
            <p className="field-hint">{t.sensors.csvColumnHint}</p>
            {formError && (
              <p className="login-error" role="alert">
                {formError}
              </p>
            )}
            <div className="row-actions">
              <button type="submit">{t.sensors.save}</button>
              <button type="button" onClick={() => setEditingId(null)}>
                {t.sensors.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
