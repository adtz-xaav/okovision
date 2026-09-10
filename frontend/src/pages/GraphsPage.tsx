import * as echarts from "echarts";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, type Graph, type GraphData, type Sensor } from "../lib/api";
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
      tooltip: { trigger: "axis" },
      legend: { top: 0 },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: { type: "time" },
      yAxis: { type: "value" },
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

  return <div ref={containerRef} className="chart-container" />;
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
        await api.createGraph(input);
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
    await api.deleteGraph(id);
    if (selectedId === id) setSelectedId("");
    loadGraphs();
  }

  return (
    <section className="page-section">
      <div className="panel">
        <h2>{t.graphs.title}</h2>
        {graphs.length === 0 ? (
          <p>{t.graphs.noGraphs}</p>
        ) : (
          <>
            <div className="filter-bar">
              <label>
                {t.graphs.select}
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {graphs.map((graph) => (
                    <option key={graph.id} value={graph.id}>
                      {graph.name}
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
            {data && <ChartView data={data} />}
          </>
        )}
      </div>

      {isAdmin && (
        <div className="panel">
          <h2>{t.graphs.manageTitle}</h2>
          <div className="table-scroll">
            <table>
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
                    <td className="row-actions">
                      <button type="button" onClick={() => startEdit(graph)}>
                        {t.sensors.edit}
                      </button>
                      <button type="button" onClick={() => removeGraph(graph.id)}>
                        {t.sensors.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingId === null ? (
            <button type="button" onClick={startAdd}>
              {t.graphs.add}
            </button>
          ) : (
            <form className="sensor-form" onSubmit={submitForm}>
              <label>
                {t.graphs.name}
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>

              <h3>{t.graphs.sensorsInGraph}</h3>
              {form.sensors.map((row, index) => (
                <div className="filter-bar" key={index}>
                  <label>
                    {t.sensors.label}
                    <select value={row.sensorId} onChange={(e) => updateSensorRow(index, { sensorId: e.target.value })}>
                      {sensors.map((sensor) => (
                        <option key={sensor.id} value={sensor.id}>
                          {sensor.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.graphs.coefficient}
                    <input
                      type="number"
                      step="any"
                      value={row.coefficient}
                      onChange={(e) => updateSensorRow(index, { coefficient: e.target.value })}
                    />
                  </label>
                  <button type="button" onClick={() => removeSensorRow(index)}>
                    {t.sensors.delete}
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSensorRow} disabled={sensors.length === 0}>
                {t.graphs.addSensor}
              </button>

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
      )}
    </section>
  );
}
