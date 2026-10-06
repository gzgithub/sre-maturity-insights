import { useTranslation } from "react-i18next";
import { LevelBadge } from "./LevelBadge";
import { ScoreRadar } from "./ScoreRadar";
import type { ScoreResult } from "@/lib/scoring";

/** Overall level, cap explanation and radar — shared by /results and /r. */
export function ResultSummary({ scores }: { scores: ScoreResult }) {
  const { t } = useTranslation();
  return (
    <>
      <section className="panel">
        <p className="eyebrow">{t("results.overall")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <LevelBadge level={scores.overallLevel} size="lg" />
          <span className="font-mono text-sm text-muted-foreground">
            {t("results.overallScore", { score: scores.overallScore.toFixed(2) })}
          </span>
        </div>
        {scores.capped && (
          <p className="mt-4 rounded-lg bg-notice p-3 text-sm leading-relaxed text-notice-foreground">
            {t("results.capped", {
              raw: `${t("levels.badge", { n: scores.rawLevel })} ${t(`levels.${scores.rawLevel}`)}`,
              dims: scores.limitingDimensions.map((d) => t(`dimensions.${d}`)).join("、"),
            })}
          </p>
        )}
      </section>
      <section className="panel" aria-labelledby="radar-title">
        <h2 id="radar-title" className="eyebrow">{t("results.radar")}</h2>
        <div className="mt-4">
          <ScoreRadar scores={scores} />
        </div>
      </section>
    </>
  );
}
