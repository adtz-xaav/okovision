import { useEffect, useRef, useState } from "react";
import { api, ApiError, type LiveReading, type LiveTag } from "../lib/api";
import { pickHeroReading } from "../lib/heroReading";
import type { Dictionary } from "../locales/en";

const POLL_INTERVAL_MS = 5000;

function formatValue(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function NowPage({ t, isAdmin }: { t: Dictionary; isAdmin: boolean }) {
  const [readings, setReadings] = useState<LiveReading[]>([]);
  const [tags, setTags] = useState<LiveTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function load() {
      api
        .getLiveValues()
        .then((data) => {
          if (!cancelled) {
            setReadings(data);
            loaded.current = true;
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : String(err));
        });
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    api.listLiveTags().then(setTags).catch(() => setTags([]));
  }, []);

  async function adjust(reading: LiveReading, direction: 1 | -1) {
    if (reading.value === null) return;
    const tag = tags.find((tg) => tg.id === reading.id);
    const step = 1;
    let next = reading.value + direction * step;
    if (tag?.minValue != null) next = Math.max(tag.minValue, next);
    if (tag?.maxValue != null) next = Math.min(tag.maxValue, next);
    if (next === reading.value) return;

    const previous = reading.value;
    setPendingId(reading.id);
    setReadings((prev) => prev.map((r) => (r.id === reading.id ? { ...r, value: next } : r)));
    try {
      await api.setLiveValue(reading.id, next);
      setError(null);
    } catch {
      setReadings((prev) => prev.map((r) => (r.id === reading.id ? { ...r, value: previous } : r)));
      setError(t.now.setError);
    } finally {
      setPendingId(null);
    }
  }

  if (!loaded.current && readings.length === 0 && !error) {
    return null;
  }

  if (error && readings.length === 0) {
    return (
      <p className="ls-error" role="alert">
        {error}
      </p>
    );
  }

  if (readings.length === 0) {
    return <p className="ls-empty">{t.live.noTags}</p>;
  }

  const hero = pickHeroReading(readings);
  const rest = readings.filter((r) => r.id !== hero?.id);
  const heroTag = hero ? tags.find((tg) => tg.id === hero.id) : undefined;
  const hasBounds = heroTag?.minValue != null && heroTag?.maxValue != null;
  const percent =
    hasBounds && hero?.value != null
      ? Math.min(1, Math.max(0, (hero.value - heroTag!.minValue!) / (heroTag!.maxValue! - heroTag!.minValue!)))
      : null;
  const circumference = 2 * Math.PI * 44;
  const running = readings.find((r) => r.key.toLowerCase().includes("status") || r.key.toLowerCase().includes("state"));

  return (
    <>
      {error && (
        <p className="ls-error" role="alert">
          {error}
        </p>
      )}

      <div className="ls-hero-wrap">
        {hero && (
          <div className="ls-hero">
            <div className="ls-hero-glow ls-hero-glow--ember" />
            <svg className="ls-hero-ring" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(237,238,233,.12)" strokeWidth="2.5" />
              {percent !== null && (
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="var(--ls-ember)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${percent * circumference} ${circumference}`}
                  transform="rotate(-90 50 50)"
                />
              )}
            </svg>
            <div className="ls-hero-value-wrap">
              <div className="ls-hero-value">
                {formatValue(hero.value)}
                {hero.unit ?? ""}
              </div>
              <div className="ls-hero-label">{hero.label}</div>
              {isAdmin && hero.writable && (
                <div className="ls-stepper" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="ls-stepper-btn"
                    disabled={pendingId === hero.id}
                    onClick={() => adjust(hero, -1)}
                    aria-label="-"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="ls-stepper-btn"
                    disabled={pendingId === hero.id}
                    onClick={() => adjust(hero, 1)}
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {isAdmin && hero?.writable && <p className="ls-hero-caption">{t.now.adjustHint}</p>}
          {running && (
            <p className="ls-hero-status">
              {running.label}: {formatValue(running.value)}
              {running.unit ?? ""}
            </p>
          )}
        </div>

        {rest.length > 0 && (
          <div className="ls-list">
            <div className="ls-list-label">{t.now.moreReadings}</div>
            <div>
              {rest.map((reading) => {
                return (
                  <div className="ls-row" key={reading.id}>
                    <span className="ls-row-label">{reading.label}</span>
                    <span className="ls-row-value">
                      {isAdmin && reading.writable ? (
                        <span className="ls-row-stepper">
                          <button
                            type="button"
                            disabled={pendingId === reading.id}
                            onClick={() => adjust(reading, -1)}
                            aria-label="-"
                          >
                            −
                          </button>
                          <span>
                            {formatValue(reading.value)}
                            {reading.unit ?? ""}
                          </span>
                          <button
                            type="button"
                            disabled={pendingId === reading.id}
                            onClick={() => adjust(reading, 1)}
                            aria-label="+"
                          >
                            +
                          </button>
                        </span>
                      ) : (
                        <>
                          {formatValue(reading.value)}
                          {reading.unit ?? ""}
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
