import { useEffect, useState } from "react";
import { api, ApiError, type LiveReading } from "../lib/api";
import type { Dictionary } from "../locales/en";

// Matches the interval the boiler's own dashboard polls itself at (found in its page
// source: `var intervalDelay = 5000;`).
const POLL_INTERVAL_MS = 5000;

export function LivePage({ t, isAdmin }: { t: Dictionary; isAdmin: boolean }) {
  const [readings, setReadings] = useState<LiveReading[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [setMessage, setSetMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .getLiveValues()
        .then((data) => {
          if (cancelled) return;
          setReadings(data);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.message : String(err));
        });
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function submitSet(id: string) {
    setSetMessage(null);
    const raw = drafts[id];
    if (raw === undefined || raw === "") return;
    try {
      await api.setLiveValue(id, Number(raw));
      setSetMessage(t.live.setSuccess);
      setDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      setSetMessage(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (error) {
    return (
      <section className="page-section">
        <p className="login-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (readings === null) return null;

  if (readings.length === 0) {
    return (
      <section className="page-section">
        <p>{t.live.noTags}</p>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.live.label}</th>
              <th>{t.live.value}</th>
              {isAdmin && <th>{t.live.setValue}</th>}
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => (
              <tr key={reading.id}>
                <td>{reading.label}</td>
                <td>
                  {reading.value === null ? "—" : reading.value}
                  {reading.unit ? ` ${reading.unit}` : ""}
                </td>
                {isAdmin && (
                  <td className="row-actions">
                    {reading.writable ? (
                      <>
                        <input
                          type="number"
                          step="any"
                          value={drafts[reading.id] ?? ""}
                          onChange={(e) => setDrafts({ ...drafts, [reading.id]: e.target.value })}
                          placeholder={reading.value === null ? "" : String(reading.value)}
                        />
                        <button type="button" onClick={() => submitSet(reading.id)}>
                          {t.live.setValue}
                        </button>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {setMessage && <p className="field-hint">{setMessage}</p>}
    </section>
  );
}
