import { useEffect, useState } from "react";
import { api, type Reading, type Sensor } from "../lib/api";
import { formatDateTime, type Language } from "../hooks/useLocale";
import type { Dictionary } from "../locales/en";

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const toLocalInput = (d: Date) => d.toISOString().slice(0, 16);
  return { from: toLocalInput(from), to: toLocalInput(to) };
}

export function HistoryPage({ t, language }: { t: Dictionary; language: Language }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [sensorId, setSensorId] = useState("");
  const [range, setRange] = useState(defaultRange);
  const [readings, setReadings] = useState<Reading[] | null>(null);

  useEffect(() => {
    api.listSensors().then(setSensors);
  }, []);

  useEffect(() => {
    if (!sensorId) {
      setReadings(null);
      return;
    }
    api
      .getReadings(sensorId, new Date(range.from).toISOString(), new Date(range.to).toISOString())
      .then(setReadings);
  }, [sensorId, range.from, range.to]);

  if (sensors.length === 0) {
    return (
      <section className="page-section">
        <p>{t.history.noSensors}</p>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="filter-bar">
        <label>
          {t.history.sensorLabel}
          <select value={sensorId} onChange={(e) => setSensorId(e.target.value)}>
            <option value="" disabled>
              —
            </option>
            {sensors.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensor.label}
                {sensor.unit ? ` (${sensor.unit})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.history.from}
          <input type="datetime-local" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </label>
        <label>
          {t.history.to}
          <input type="datetime-local" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </label>
      </div>

      {!sensorId && <p>{t.history.selectSensorPrompt}</p>}

      {sensorId && readings && readings.length === 0 && <p>{t.history.noReadings}</p>}

      {sensorId && readings && readings.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.history.timestamp}</th>
                <th>{t.history.value}</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.timestamp}>
                  <td>{formatDateTime(reading.timestamp, language)}</td>
                  <td>{reading.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
