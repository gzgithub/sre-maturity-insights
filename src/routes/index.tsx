import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer, useDocumentTitle } from "@/components/SiteChrome";
import { DIMENSION_IDS } from "@/data/dimensions";
import zh from "@/locales/zh-TW/common.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: zh.site.name },
      { name: "description", content: zh.site.description },
      { property: "og:title", content: zh.site.name },
      { property: "og:description", content: zh.site.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  useDocumentTitle();
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">{t("landing.eyebrow")}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t("site.name")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/85">{t("landing.lead")}</p>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{t("landing.detail")}</p>
          <Button asChild size="xl" className="mt-8">
            <Link to="/start">
              {t("landing.start")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {(["questions", "minutes", "dimensions"] as const).map((k) => (
            <div key={k} className="panel py-4">
              <dt className="sr-only">{t(`landing.factLabels.${k}`)}</dt>
              <dd className="font-mono text-sm sm:text-base">{t(`landing.facts.${k}`)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="dims" className="border-t border-border/70 py-10">
        <h2 id="dims" className="sr-only">{t("results.dimensionsTitle")}</h2>
        <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSION_IDS.map((d, i) => (
            <li key={d} className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <span>{t(`dimensions.${d}`)}</span>
            </li>
          ))}
        </ol>
      </section>
      <Disclaimer />
    </div>
  );
}
