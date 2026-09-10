import { useEffect, useMemo, useState } from "react";
import { api, type Reading, type Sensor } from "../lib/api";
import type { Dictionary } from "../locales/en";

type RangeKey = "24h" | "7d" | "30d";

const RANGE_MS: Record<RangeKey, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function HistoryPage({ t }: { t: Dictionary }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [sensorId, setSensorId] = useState("");
  const [range, setRange] = useState<RangeKey>("7d");
  const [readings, setReadings] = useState<Reading[] | null>(null);

  useEffect(() => {
    api.listSensors().then((list) => {
      setSensors(list);
      if (list.length > 0) setSensorId((current) => current || list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!sensorId) return;
    const to = new Date();
    const from = new Date(to.getTime() - RANGE_MS[range]);
    api.getReadings(sensorId, from.toISOString(), to.toISOString()).then(setReadings);
  }, [sensorId, range]);

  const sensor = sensors.find((s) => s.id === sensorId);
  const unit = sensor?.unit ?? "";

  const chart = useMemo(() => {
    if (!readings || readings.length === 0) return null;
    const times = readings.map((r) => new Date(r.timestamp).getTime());
    const values = readings.map((r) => r.value);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const spanT = maxT - minT || 1;
    const spanV = maxV - minV || 1;
    const width = 1000;
    const height = 220;
    const points = readings.map((r) => {
      const t = new Date(r.timestamp).getTime();
      const x = ((t - minT) / spanT) * width;
      const y = height - ((r.value - minV) / spanV) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { points: points.join(" "), width, height, minV, maxV };
  }, [readings]);

  if (sensors.length === 0) {
    return <p className="ls-empty">{t.history.noSensors}</p>;
  }

  return (
    <div className="ls-page-wide" style={{ width: "100%" }}>
      <div className="ls-sensor-picker">
        {sensors.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ls-sensor-chip${s.id === sensorId ? " ls-sensor-chip--active" : ""}`}
            onClick={() => setSensorId(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="ls-range-tabs">
        {(["24h", "7d", "30d"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`ls-range-tab${range === key ? " ls-range-tab--active" : ""}`}
            onClick={() => setRange(key)}
          >
            {key === "24h" ? t.history.last24h : key === "7d" ? t.history.last7d : t.history.last30d}
          </button>
        ))}
      </div>

      {readings && readings.length === 0 && <p className="ls-empty">{t.history.noReadings}</p>}

      {chart && (
        <>
          <svg width="100%" height="220" viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none">
            <polyline points={chart.points} fill="none" stroke="var(--ls-mist)" strokeWidth="2.2" />
          </svg>
          <p className="ls-chart-caption" style={{ marginTop: 12 }}>
            {t.history.rangeCaption
              .replace("{min}", `${formatValue(chart.minV)}${unit}`)
              .replace("{max}", `${formatValue(chart.maxV)}${unit}`)
              .replace("{range}", range === "24h" ? t.history.last24h : range === "7d" ? t.history.last7d : t.history.last30d)}
          </p>
        </>
      )}
    </div>
  );
}
