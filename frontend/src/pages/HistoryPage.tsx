import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type Graph, type Reading, type Sensor } from "../lib/api";
import { SERIES_COLORS } from "../lib/seriesColors";
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

export function HistoryPage({ t, isAdmin }: { t: Dictionary; isAdmin: boolean }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [range, setRange] = useState<RangeKey>("7d");
  const [seriesReadings, setSeriesReadings] = useState<Record<string, Reading[]>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api.listSensors().then((list) => {
      setSensors(list);
      setSelectedIds((current) => (current.length > 0 ? current : list.length > 0 ? [list[0].id] : current));
    });
    api
      .listGraphs()
      .then(setGraphs)
      .catch(() => setGraphs([]));
  }, []);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSeriesReadings({});
      return;
    }
    let cancelled = false;
    const to = new Date();
    const from = new Date(to.getTime() - RANGE_MS[range]);
    Promise.all(
      selectedIds.map((id) =>
        api.getReadings(id, from.toISOString(), to.toISOString()).then((readings) => [id, readings] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setSeriesReadings(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedIds, range]);

  function toggleSensor(id: string) {
    setSaveError(null);
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function applyGraph(graph: Graph) {
    setSaveError(null);
    setSelectedIds(graph.sensors.map((s) => s.sensorId));
  }

  async function saveView() {
    const name = window.prompt(t.history.saveViewPrompt);
    if (!name) return;
    setSaveError(null);
    try {
      const created = await api.createGraph({
        name,
        position: graphs.length,
        sensors: selectedIds.map((id, i) => ({ sensorId: id, coefficient: 1, position: i })),
      });
      setGraphs((current) => [...current, created]);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t.history.saveViewError);
    }
  }

  const series = useMemo(
    () =>
      selectedIds.map((id, i) => {
        const sensor = sensors.find((s) => s.id === id);
        return {
          sensorId: id,
          label: sensor?.label ?? id,
          unit: sensor?.unit ?? "",
          color: SERIES_COLORS[i % SERIES_COLORS.length],
          readings: seriesReadings[id] ?? [],
        };
      }),
    [selectedIds, sensors, seriesReadings],
  );

  const chart = useMemo(() => {
    const withData = series.filter((s) => s.readings.length > 0);
    if (withData.length === 0) return null;
    const allTimes = withData.flatMap((s) => s.readings.map((r) => new Date(r.timestamp).getTime()));
    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);
    const spanT = maxT - minT || 1;
    const width = 1000;
    const height = 220;
    const lines = withData.map((s) => {
      const values = s.readings.map((r) => r.value);
      const minV = Math.min(...values);
      const maxV = Math.max(...values);
      const spanV = maxV - minV || 1;
      const points = s.readings
        .map((r) => {
          const x = ((new Date(r.timestamp).getTime() - minT) / spanT) * width;
          const y = height - ((r.value - minV) / spanV) * height;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return { sensorId: s.sensorId, label: s.label, unit: s.unit, color: s.color, points, minV, maxV, current: values[values.length - 1] };
    });
    return { lines, width, height };
  }, [series]);

  if (sensors.length === 0) {
    return <p className="ls-empty">{t.history.noSensors}</p>;
  }

  return (
    <div className="ls-page-wide" style={{ width: "100%" }}>
      {graphs.length > 0 && (
        <>
          <div className="ls-list-label">{t.history.savedViewsLabel}</div>
          <div className="ls-sensor-picker">
            {graphs.map((g) => (
              <button key={g.id} type="button" className="ls-sensor-chip" onClick={() => applyGraph(g)}>
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="ls-list-label">{t.history.compareLabel}</div>
      <div className="ls-sensor-picker">
        {sensors.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ls-sensor-chip${selectedIds.includes(s.id) ? " ls-sensor-chip--active" : ""}`}
            onClick={() => toggleSensor(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isAdmin && selectedIds.length > 0 && (
        <button type="button" className="ls-text-action" style={{ marginBottom: 20 }} onClick={saveView}>
          {t.history.saveView}
        </button>
      )}
      {saveError && (
        <p className="ls-error" role="alert">
          {saveError}
        </p>
      )}

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

      {selectedIds.length === 0 && <p className="ls-empty">{t.history.selectSensorPrompt}</p>}
      {selectedIds.length > 0 && !chart && <p className="ls-empty">{t.history.noReadings}</p>}

      {chart && (
        <>
          <svg width="100%" height="220" viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none">
            {chart.lines.map((line) => (
              <polyline key={line.sensorId} points={line.points} fill="none" stroke={line.color} strokeWidth="2.2" opacity="0.9" />
            ))}
          </svg>

          <div className="ls-list" style={{ maxWidth: "none", marginTop: 20 }}>
            {chart.lines.map((line) => (
              <div className="ls-row" key={line.sensorId}>
                <span className="ls-row-label" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="ls-legend-dot" style={{ background: line.color }} />
                    {line.label}
                  </span>
                  <span className="ls-chart-caption" style={{ margin: 0 }}>
                    {formatValue(line.minV)}–{formatValue(line.maxV)}
                    {line.unit}
                  </span>
                </span>
                <span className="ls-row-value">
                  {formatValue(line.current)}
                  {line.unit}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
