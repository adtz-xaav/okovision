import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { pickHeroReading } from "../lib/heroReading";
import { format } from "../hooks/useLocale";
import type { Dictionary } from "../locales/en";

const IDLE_AFTER_MS = 90_000;
const CLOCK_TICK_MS = 15_000;
const STATUS_POLL_MS = 30_000;

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function IdleOverlay({ t }: { t: Dictionary }) {
  const [idle, setIdle] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [status, setStatus] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      setIdle(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIdle(true), IDLE_AFTER_MS);
    }

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "wheel"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!idle) return;
    const clock = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(clock);
  }, [idle]);

  useEffect(() => {
    if (!idle) return;
    let cancelled = false;

    function poll() {
      api
        .getLiveValues()
        .then((readings) => {
          if (cancelled) return;
          const hero = pickHeroReading(readings);
          if (hero && hero.value !== null) {
            setStatus(format(t.idle.status, { label: hero.label, value: String(hero.value), unit: hero.unit ?? "" }));
          }
        })
        .catch(() => {});
    }

    poll();
    const interval = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [idle, t]);

  if (!idle) return null;

  return (
    <div className="ls-idle" onPointerDown={() => setIdle(false)}>
      <div className="ls-idle-glow" />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="ls-idle-time">{formatClock(now)}</div>
        {status && <div className="ls-idle-status">{status}</div>}
      </div>
      <div className="ls-idle-brand">{t.appName}</div>
    </div>
  );
}
