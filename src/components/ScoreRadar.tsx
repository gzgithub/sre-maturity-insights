import { useTranslation } from "react-i18next";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { ScoreResult } from "@/lib/scoring";

/** Radar (self-reported vs calibrated, 1–4) plus an equivalent data table. */
export function ScoreRadar({ scores }: { scores: ScoreResult }) {
  const { t } = useTranslation();
  const data = scores.dimensions.map((d) => ({
    dim: t(`dimensions.${d.id}`),
    self: Number(d.selfReported.toFixed(2)),
    calibrated: Number(d.calibrated.toFixed(2)),
  }));
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
      <figure role="img" aria-label={t("results.radarAlt")} className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="68%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 4]} tickCount={5} angle={90} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
            <Radar
              name={t("results.self")}
              dataKey="self"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.12}
              strokeDasharray="5 4"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Radar
              name={t("results.calibrated")}
              dataKey="calibrated"
              stroke="var(--chart-2)"
              fill="var(--chart-2)"
              fillOpacity={0.22}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </figure>
      <table className="w-full text-sm">
        <caption className="mb-2 text-left eyebrow">{t("results.table.caption")}</caption>
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-2 font-medium">{t("results.table.dimension")}</th>
            <th scope="col" className="py-2 px-2 text-right font-medium">{t("results.table.self")}</th>
            <th scope="col" className="py-2 px-2 text-right font-medium">{t("results.table.calibrated")}</th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">{t("results.table.level")}</th>
          </tr>
        </thead>
        <tbody>
          {scores.dimensions.map((d) => (
            <tr key={d.id} className="border-b border-border/60">
              <th scope="row" className="py-2 pr-2 text-left font-normal">{t(`dimensions.${d.id}`)}</th>
              <td className="py-2 px-2 text-right font-mono">{d.selfReported.toFixed(2)}</td>
              <td className="py-2 px-2 text-right font-mono">{d.calibrated.toFixed(2)}</td>
              <td className="py-2 pl-2 text-right font-mono">{t("levels.badge", { n: d.level })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
