import { useEffect, useMemo, useState } from "react";
import { api, type DailySynthesis, type MonthlySynthesis, type Season, type SeasonSynthesis } from "../lib/api";
import type { Dictionary } from "../locales/en";

function weightedEfficiency(months: MonthlySynthesis[]): number | null {
  let sumWeighted = 0;
  let sumWeight = 0;
  for (const m of months) {
    if (m.efficiencyGPerDjuM2 != null && m.dju != null && m.dju > 0) {
      sumWeighted += m.efficiencyGPerDjuM2 * m.dju;
      sumWeight += m.dju;
    }
  }
  return sumWeight > 0 ? sumWeighted / sumWeight : null;
}

function sumField(months: MonthlySynthesis[], field: "consoKg" | "nbCycle" | "dju"): number {
  return months.reduce((total, m) => total + (m[field] ?? 0), 0);
}

function pickSeasons(seasons: Season[]): { current: Season | null; previous: Season | null } {
  if (seasons.length === 0) return { current: null, previous: null };
  const sorted = [...seasons].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const now = Date.now();
  let currentIndex = -1;
  sorted.forEach((s, i) => {
    if (new Date(s.startDate).getTime() <= now) currentIndex = i;
  });
  if (currentIndex === -1) currentIndex = 0;
  return { current: sorted[currentIndex], previous: currentIndex > 0 ? sorted[currentIndex - 1] : null };
}

export function TrendsPage({ t }: { t: Dictionary }) {
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [currentData, setCurrentData] = useState<SeasonSynthesis | null>(null);
  const [previousData, setPreviousData] = useState<SeasonSynthesis | null>(null);
  const [daily, setDaily] = useState<DailySynthesis[] | null>(null);

  useEffect(() => {
    api.listSeasons().then(setSeasons);
  }, []);

  const { current, previous } = useMemo(() => pickSeasons(seasons ?? []), [seasons]);

  useEffect(() => {
    if (!current) return;
    api.getSeasonSynthesis(current.id).then(setCurrentData);
  }, [current]);

  useEffect(() => {
    if (!previous) {
      setPreviousData(null);
      return;
    }
    api.getSeasonSynthesis(previous.id).then(setPreviousData);
  }, [previous]);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    api.getSynthesisRange(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)).then(setDaily);
  }, []);

  const trendDays = useMemo(() => (daily ?? []).filter((d) => d.consoKg != null), [daily]);
  const chart = useTrendChart(trendDays);

  if (seasons === null) return null;

  if (!current || !currentData) {
    return <p className="ls-empty">{t.synthesis.noSeasons}</p>;
  }

  const currentEff = weightedEfficiency(currentData.months);
  const previousEff = previousData ? weightedEfficiency(previousData.months) : null;
  const deltaPct = currentEff != null && previousEff != null && previousEff > 0 ? ((previousEff - currentEff) / previousEff) * 100 : null;

  const totalKg = sumField(currentData.months, "consoKg");
  const totalCycles = sumField(currentData.months, "nbCycle");
  const totalDju = sumField(currentData.months, "dju");

  return (
    <div className="ls-hero-wrap">
      <div className="ls-hero">
        <div className="ls-hero-glow ls-hero-glow--moss" />
        <div className="ls-hero-value-wrap">
          {deltaPct != null ? (
            <>
              <div className="ls-hero-value ls-hero-value--moss">
                {deltaPct >= 0 ? "+" : ""}
                {deltaPct.toFixed(0)}%
              </div>
              <div className="ls-hero-label">{deltaPct >= 0 ? t.trends.moreEfficient : t.trends.lessEfficient}</div>
            </>
          ) : (
            <>
              <div className="ls-hero-value ls-hero-value--moss">{Math.round(totalKg)}</div>
              <div className="ls-hero-label">{t.trends.pellets.toLowerCase()}</div>
              <p className="ls-hero-caption" style={{ marginTop: 8 }}>
                {t.trends.notEnoughData}
              </p>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 620, display: "flex", flexDirection: "column", gap: 28 }}>
        {chart && (
          <div>
            <div className="ls-chart-caption">{t.trends.dailyTrend}</div>
            <svg width="100%" height="110" viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none">
              <polyline points={chart.points} fill="none" stroke="var(--ls-mist)" strokeWidth="2" opacity="0.85" />
            </svg>
            <div className="ls-chart-endpoints">
              <span>{chart.firstLabel}</span>
              <span>{chart.lastLabel}</span>
            </div>
          </div>
        )}
        {!chart && <p className="ls-empty" style={{ margin: 0 }}>{t.trends.noTrendData}</p>}

        <div className="ls-list" style={{ maxWidth: "none" }}>
          <div className="ls-list-label">{t.trends.seasonSoFar}</div>
          <div>
            <div className="ls-row">
              <span className="ls-row-label">{t.trends.pellets}</span>
              <span className="ls-row-value">{Math.round(totalKg)} kg</span>
            </div>
            <div className="ls-row">
              <span className="ls-row-label">{t.trends.cycles}</span>
              <span className="ls-row-value">{Math.round(totalCycles)}</span>
            </div>
            <div className="ls-row">
              <span className="ls-row-label">{t.trends.degreeDays}</span>
              <span className="ls-row-value">{Math.round(totalDju)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function useTrendChart(days: DailySynthesis[]) {
  return useMemo(() => {
    if (days.length < 2) return null;
    const values = days.map((d) => d.consoKg as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const width = 600;
    const height = 110;
    const points = days
      .map((d, i) => {
        const x = (i / (days.length - 1)) * width;
        const y = height - (((d.consoKg as number) - min) / span) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return {
      points,
      width,
      height,
      firstLabel: `${days[0].day}, ${days[0].consoKg} kg`,
      lastLabel: `${days[days.length - 1].day}, ${days[days.length - 1].consoKg} kg`,
    };
  }, [days]);
}
