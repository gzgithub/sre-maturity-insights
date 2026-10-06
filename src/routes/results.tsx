import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Link2, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer, useDocumentTitle } from "@/components/SiteChrome";
import { ExternalLink } from "@/components/ExternalLink";
import { LevelBadge } from "@/components/LevelBadge";
import { ResultSummary } from "@/components/ResultSummary";
import { QUESTIONS, type Role } from "@/data/questions";
import type { NodeId } from "@/data/nodes";
import { articlesFor } from "@/data/nodeArticles";
import { firstUnanswered, isComplete, useAssessment } from "@/lib/assessmentStore";
import { computeScores, dimensionInsight } from "@/lib/scoring";
import { recommend } from "@/lib/recommend";
import { buildShareUrl } from "@/lib/shareUrl";
import { useSubmitStatus } from "@/lib/submitClient";
import zh from "@/locales/zh-TW/common.json";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: `${zh.results.title} | ${zh.site.name}` },
      { name: "description", content: zh.site.description },
      { property: "og:title", content: `${zh.results.title} | ${zh.site.name}` },
      { property: "og:description", content: zh.site.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { t, i18n } = useTranslation(["common", "questions", "recommendations"]);
  useDocumentTitle(t("results.title"));
  const navigate = useNavigate();
  const { state, hydrated, reset } = useAssessment();
  const saveStatus = useSubmitStatus();
  const complete = isComplete(state);

  useEffect(() => {
    if (!hydrated) return;
    if (!state.role || !state.team || !state.svc) navigate({ to: "/start", replace: true });
    else if (!complete) navigate({ to: "/q/$n", params: { n: String(firstUnanswered(state) + 1) }, replace: true });
    else if (state.submission === "none") navigate({ to: "/contact", replace: true });
  }, [hydrated, state, complete, navigate]);

  const answers = state.answers as number[];
  const scores = useMemo(() => (complete ? computeScores(answers) : null), [complete, answers]);
  const rec = useMemo(() => (complete && state.team ? recommend(answers, state.team) : null), [complete, answers, state.team]);

  if (!hydrated || !complete || state.submission === "none" || !scores || !rec) return null;
  const role = state.role as Role;

  const share = async () => {
    const url = buildShareUrl(window.location.origin, {
      lang: i18n.resolvedLanguage ?? "zh-TW",
      role,
      team: state.team!,
      svc: state.svc!,
      answers,
    });
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("results.shareCopied"));
    } catch {
      toast(t("results.shareFailed", { url }));
    }
  };

  const optionText = (qid: string, v: number) =>
    v === 0 ? t(`questions:${qid}.unsure`) : t(`questions:${qid}.options.${v}`);
  const nodeList = (ids: NodeId[]) => ids.map((id) => t(`recommendations:${id}.name`)).join(t("list.separator"));

  const RecCard = ({ slot, node }: { slot: "now" | "next"; node: NodeId }) => (
    <article className="panel">
      <p className="eyebrow">{t(`results.${slot}`)}</p>
      <h3 className="mt-2 text-lg font-semibold">{t(`recommendations:${node}.name`)}</h3>
      {role === "manager" ? (
        <div className="mt-3">
          <p className="text-sm font-medium text-muted-foreground">{t("results.managerBlock")}</p>
          <p className="mt-1 leading-relaxed">{t(`recommendations:${node}.manager`)}</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("results.engineerWeek")}</p>
            <p className="mt-1 leading-relaxed">{t(`recommendations:${node}.engineer.week`)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("results.engineerPitch")}</p>
            <blockquote className="mt-1 border-l-2 border-primary pl-3 italic leading-relaxed">
              {t(`recommendations:${node}.engineer.pitch`)}
            </blockquote>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {articlesFor(node).map((href) => (
          <ExternalLink key={href} href={href}>{t("results.readMore")}</ExternalLink>
        ))}
      </div>
    </article>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t("results.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("results.role", { role: t(`roles.${role}`) })}</p>
      </header>

      {saveStatus === "retrying" && (
        <p role="status" className="no-print flex items-start gap-2 rounded-lg bg-notice p-3 text-sm text-notice-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("results.saveFailed")}
        </p>
      )}

      <ResultSummary scores={scores} />

      <section aria-labelledby="dims-title">
        <h2 id="dims-title" className="mb-4 text-xl font-semibold">{t("results.dimensionsTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {scores.dimensions.map((d) => {
            const ins = dimensionInsight(d.id, answers, state.team!);
            return (
              <article key={d.id} className="panel space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{t(`dimensions.${d.id}`)}</h3>
                  <LevelBadge level={d.level} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("results.whereNow")}</p>
                  <p className="mt-1 leading-relaxed">{optionText(ins.questionId, ins.answer)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("results.nextLevel")}</p>
                  {ins.nextLevel === null ? (
                    <p className="mt-1">{t("results.highest")}</p>
                  ) : ins.smallTeamSkip ? (
                    <p className="mt-1 text-muted-foreground">{t("results.smallTeamSkip")}</p>
                  ) : (
                    <p className="mt-1 leading-relaxed">{optionText(ins.questionId, ins.nextLevel)}</p>
                  )}
                </div>
                {d.gap && (
                  <p className="flex items-start gap-2 rounded-lg bg-notice p-2.5 text-sm text-notice-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("results.gap")}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {scores.transparencyGaps.length > 0 && (
        <section className="panel" aria-labelledby="gaps-title">
          <h2 id="gaps-title" className="text-xl font-semibold">{t("results.gapsTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("results.gapsLead")}</p>
          <ul className="mt-4 space-y-2">
            {scores.transparencyGaps.map((qid) => {
              const q = QUESTIONS.find((x) => x.id === qid)!;
              return (
                <li key={qid} className="border-l-2 border-level-2 pl-3">
                  <span className="font-medium">{t(`questions:${qid}.title`)}</span>
                  <span className="block text-sm text-muted-foreground">{t(`questions:${qid}.stem.${role}`)}</span>
                  <span className="sr-only">{t(`dimensions.${q.dimension}`)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="recs-title" className="space-y-4">
        <div>
          <h2 id="recs-title" className="text-xl font-semibold">{t("results.recsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("results.recsLead")}</p>
        </div>
        {rec.now && <RecCard slot="now" node={rec.now} />}
        {rec.next && <RecCard slot="next" node={rec.next} />}
        {rec.deferred && (
          <article className="panel border-dashed">
            <p className="eyebrow">{t("results.deferred")}</p>
            <h3 className="mt-2 text-lg font-semibold">{t(`recommendations:${rec.deferred.node}.name`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {rec.deferred.missing.length > 0 && t("results.deferredReason", { list: nodeList(rec.deferred.missing) })}
              {rec.deferred.upstream.length > 0 && t("results.upstream", { list: nodeList(rec.deferred.upstream) })}
              {rec.deferred.missingConditions.length > 0 && <> {t("results.ciMissing")}</>}
            </p>
          </article>
        )}
        {rec.allClear && <p className="panel leading-relaxed">{t("results.allClear")}</p>}
      </section>

      <section className="no-print panel space-y-3">
        <div className="flex flex-wrap gap-3">
          <Button onClick={share}><Link2 aria-hidden /> {t("results.share")}</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer aria-hidden /> {t("results.print")}</Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              navigate({ to: "/start" });
            }}
          >
            <RotateCcw aria-hidden /> {t("results.retake")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("results.shareNote")}</p>
      </section>

      <Disclaimer />
    </div>
  );
}
