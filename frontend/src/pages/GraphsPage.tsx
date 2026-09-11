import * as echarts from "echarts";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, type Graph, type GraphData, type Sensor } from "../lib/api";
import { SERIES_COLORS } from "../lib/seriesColors";
import type { Dictionary } from "../locales/en";

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const toLocalInput = (d: Date) => d.toISOString().slice(0, 16);
  return { from: toLocalInput(from), to: toLocalInput(to) };
}

function ChartView({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: "rgba(237, 238, 233, 0.75)", fontFamily: "inherit" },
      color: SERIES_COLORS,
      tooltip: {
        trigger: "axis",
        backgroundColor: "#3a342e",
        borderColor: "rgba(237, 238, 233, 0.12)",
        textStyle: { color: "#edeeE9" },
      },
      legend: { top: 0, textStyle: { color: "rgba(237, 238, 233, 0.6)" } },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: "rgba(237, 238, 233, 0.2)" } },
        axisLabel: { color: "rgba(237, 238, 233, 0.4)" },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisLabel: { color: "rgba(237, 238, 233, 0.4)" },
        splitLine: { lineStyle: { color: "rgba(237, 238, 233, 0.08)" } },
      },
      series: data.series.map((s) => ({
        name: s.unit ? `${s.label} (${s.unit})` : s.label,
        type: "line",
        showSymbol: false,
        data: s.points.map((p) => [p.timestamp, p.value]),
      })),
    });
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={containerRef} className="ls-chart-container" />;
}

type SensorRow = { sensorId: string; coefficient: string; position: number };
type GraphFormState = { name: string; sensors: SensorRow[] };

function toFormState(graph: Graph): GraphFormState {
  return {
    name: graph.name,
    sensors: graph.sensors.map((s) => ({ sensorId: s.sensorId, coefficient: String(s.coefficient), position: s.position })),
  };
}

export function GraphsPage({ t, isAdmin }: { t: Dictionary; isAdmin: boolean }) {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState<GraphData | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GraphFormState>({ name: "", sensors: [] });
  const [formError, setFormError] = useState<string | null>(null);

  function loadGraphs() {
    api.listGraphs().then((list) => {
      setGraphs(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    });
  }

  useEffect(() => {
    loadGraphs();
    api.listSensors().then(setSensors);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setData(null);
      return;
    }
    api.getGraphData(selectedId, new Date(range.from).toISOString(), new Date(range.to).toISOString()).then(setData);
  }, [selectedId, range.from, range.to]);

  function startAdd() {
    setEditingId("new");
    setForm({ name: "", sensors: [] });
    setFormError(null);
  }

  function startEdit(graph: Graph) {
    setEditingId(graph.id);
    setForm(toFormState(graph));
    setFormError(null);
  }

  function addSensorRow() {
    if (sensors.length === 0) return;
    setForm({ ...form, sensors: [...form.sensors, { sensorId: sensors[0].id, coefficient: "1", position: form.sensors.length }] });
  }

  function updateSensorRow(index: number, patch: Partial<SensorRow>) {
    setForm({ ...form, sensors: form.sensors.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  }

  function removeSensorRow(index: number) {
    setForm({ ...form, sensors: form.sensors.filter((_, i) => i !== index) });
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const input = {
      name: form.name,
      position: 0,
      sensors: form.sensors.map((row, i) => ({ sensorId: row.sensorId, coefficient: Number(row.coefficient) || 1, position: i })),
    };
    try {
      if (editingId === "new") {
        const created = await api.createGraph(input);
        setSelectedId(created.id);
      } else if (editingId) {
        await api.updateGraph(editingId, input);
      }
      setEditingId(null);
      loadGraphs();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function removeGraph(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return;
    await api.deleteGraph(id);
    if (selectedId === id) setSelectedId("");
    loadGraphs();
  }

  return (
    <div className="ls-page-wide" style={{ width: "100%" }}>
      <div className="ls-panel">
        <h2 className="ls-panel-title">{t.graphs.title}</h2>
        {graphs.length === 0 ? (
          <p className="ls-empty">{t.graphs.noGraphs}</p>
        ) : (
          <>
            <div className="ls-form-grid">
              <label className="ls-field">
                <span className="ls-field-label">{t.graphs.select}</span>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {graphs.map((graph) => (
                    <option key={graph.id} value={graph.id}>
                      {graph.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.history.from}</span>
                <input type="datetime-local" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
              </label>
              <label className="ls-field">
                <span className="ls-field-label">{t.history.to}</span>
                <input type="datetime-local" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
              </label>
            </div>
            {data && <ChartView data={data} />}
          </>
        )}
      </div>

      {isAdmin && (
        <div className="ls-panel">
          <h2 className="ls-panel-title">{t.graphs.manageTitle}</h2>
          <div className="ls-table-wrap">
            <table className="ls-table">
              <thead>
                <tr>
                  <th>{t.sensors.label}</th>
                  <th>{t.graphs.sensorCount}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {graphs.map((graph) => (
                  <tr key={graph.id}>
                    <td>{graph.name}</td>
                    <td>{graph.sensors.length}</td>
                    <td>
                      <span className="ls-btn-row">
                        <button type="button" className="ls-text-action" onClick={() => startEdit(graph)}>
                          {t.sensors.edit}
                        </button>
                        <button type="button" className="ls-text-action ls-text-action--danger" onClick={() => removeGraph(graph.id)}>
                          {t.sensors.delete}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingId === null ? (
            <button type="button" className="ls-btn ls-btn-primary" onClick={startAdd}>
              {t.graphs.add}
            </button>
          ) : (
            <form onSubmit={submitForm}>
              <label className="ls-field" style={{ maxWidth: 360 }}>
                <span className="ls-field-label">{t.graphs.name}</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>

              <h3 className="ls-panel-subtitle">{t.graphs.sensorsInGraph}</h3>
              {form.sensors.map((row, index) => (
                <div className="ls-form-grid" key={index} style={{ alignItems: "flex-end" }}>
                  <label className="ls-field">
                    <span className="ls-field-label">{t.sensors.label}</span>
                    <select value={row.sensorId} onChange={(e) => updateSensorRow(index, { sensorId: e.target.value })}>
                      {sensors.map((sensor) => (
                        <option key={sensor.id} value={sensor.id}>
                          {sensor.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ls-field">
                    <span className="ls-field-label">{t.graphs.coefficient}</span>
                    <input
                      type="number"
                      step="any"
                      value={row.coefficient}
                      onChange={(e) => updateSensorRow(index, { coefficient: e.target.value })}
                    />
                  </label>
                  <button type="button" className="ls-text-action ls-text-action--danger" onClick={() => removeSensorRow(index)}>
                    {t.sensors.delete}
                  </button>
                </div>
              ))}
              <button type="button" className="ls-text-action" style={{ marginBottom: 20 }} onClick={addSensorRow} disabled={sensors.length === 0}>
                {t.graphs.addSensor}
              </button>

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
      )}
    </div>
  );
}
