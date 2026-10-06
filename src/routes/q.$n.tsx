import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDocumentTitle } from "@/components/SiteChrome";
import { QUESTIONS, QUESTION_COUNT, allowsUnsure } from "@/data/questions";
import { firstUnanswered, seededShuffle, useAssessment } from "@/lib/assessmentStore";
import zh from "@/locales/zh-TW/common.json";

export const Route = createFileRoute("/q/$n")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.n} / ${QUESTION_COUNT} | ${zh.site.name}` },
      { name: "description", content: zh.site.description },
      { property: "og:title", content: zh.site.name },
      { property: "og:description", content: zh.site.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuestionPage,
});

const SECONDS_PER_QUESTION = 15;

function QuestionPage() {
  const { n } = Route.useParams();
  const idx = Number(n) - 1;
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "questions"]);
  const { state, hydrated, setAnswer } = useAssessment();
  const timer = useRef<number | null>(null);
  const q = QUESTIONS[idx];
  useDocumentTitle(t("question.progress", { n: idx + 1, total: QUESTION_COUNT }));

  // Guard rails: need a role; can't skip ahead of the first unanswered question.
  useEffect(() => {
    if (!hydrated) return;
    if (!state.role || !state.team || !state.svc) return void navigate({ to: "/start", replace: true });
    if (!q) return void navigate({ to: "/q/$n", params: { n: "1" }, replace: true });
    const first = firstUnanswered(state);
    if (first !== -1 && idx > first) navigate({ to: "/q/$n", params: { n: String(first + 1) }, replace: true });
  }, [hydrated, state, idx, q, navigate]);

  const options = useMemo(() => {
    if (!q || !state.role) return [];
    const base = q.kind === "scenario" ? seededShuffle([1, 2, 3, 4], state.seed + idx * 7919) : [1, 2, 3, 4];
    return allowsUnsure(q, state.role) ? [...base, 0] : base;
  }, [q, state.role, state.seed, idx]);

  const current = state.answers[idx];

  const advance = useCallback(() => {
    if (idx + 1 < QUESTION_COUNT) navigate({ to: "/q/$n", params: { n: String(idx + 2) } });
    else navigate({ to: "/contact" });
  }, [idx, navigate]);

  const select = useCallback(
    (v: number) => {
      setAnswer(idx, v);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(advance, 380);
    },
    [idx, setAnswer, advance],
  );

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), [idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "SELECT" || tag === "INPUT") return;
      const d = Number(e.key);
      if (Number.isInteger(d) && d >= 1 && d <= options.length) {
        e.preventDefault();
        select(options[d - 1]);
      } else if (e.key === "Enter" && current != null && tag !== "BUTTON") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, select, current, advance]);

  if (!hydrated || !q || !state.role) return null;

  const remainingMin = Math.max(1, Math.ceil(((QUESTION_COUNT - idx) * SECONDS_PER_QUESTION) / 60));
  const back = () => (idx === 0 ? navigate({ to: "/start" }) : navigate({ to: "/q/$n", params: { n: String(idx) } }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-mono">{t("question.progress", { n: idx + 1, total: QUESTION_COUNT })}</span>
        <span>{t("question.remaining", { min: remainingMin })}</span>
      </div>
      <Progress
        value={((idx + (current != null ? 1 : 0)) / QUESTION_COUNT) * 100}
        className="mt-3 h-1.5"
        aria-label={t("question.progress", { n: idx + 1, total: QUESTION_COUNT })}
      />

      <p className="eyebrow mt-10">
        {t(`dimensions.${q.dimension}`)} · {t(`questions:${q.id}.title`)}
      </p>
      <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight sm:text-[1.7rem]">
        {t(`questions:${q.id}.stem.${state.role}`)}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {q.kind === "evidence" ? t("question.evidence") : t("question.scenario")}
      </p>

      <div role="radiogroup" aria-label={t("question.options")} className="mt-6 grid gap-3">
        {options.map((v, i) => (
          <button key={v} type="button" role="radio" aria-checked={current === v} onClick={() => select(v)} className="option-card">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded border border-border font-mono text-xs text-muted-foreground" aria-hidden>
              {i + 1}
            </span>
            <span className={v === 0 ? "text-muted-foreground" : undefined}>
              {v === 0 ? t(`questions:${q.id}.unsure`) : t(`questions:${q.id}.options.${v}`)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft aria-hidden /> {t("question.back")}
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">{t("question.keyboard")}</span>
        <Button variant="outline" onClick={advance} disabled={current == null}>
          {t("question.next")} <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
