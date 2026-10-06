import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Disclaimer, useDocumentTitle } from "@/components/SiteChrome";
import { LevelBadge } from "@/components/LevelBadge";
import { ResultSummary } from "@/components/ResultSummary";
import { decodeShare } from "@/lib/shareUrl";
import { computeScores } from "@/lib/scoring";
import zh from "@/locales/zh-TW/common.json";

export const Route = createFileRoute("/r")({
  head: () => ({
    meta: [
      { title: `${zh.shared.title} | ${zh.site.name}` },
      { name: "description", content: zh.shared.lead },
      { property: "og:title", content: `${zh.shared.title} | ${zh.site.name}` },
      { property: "og:description", content: zh.shared.lead },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedPage,
});

function SharedPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("shared.title"));
  // Read the raw query string: the router's JSON search parsing would mangle the 20-digit answer code.
  const [search, setSearch] = useState<string | null>(null);
  useEffect(() => setSearch(window.location.search), []);
  const decoded = useMemo(() => (search === null ? null : decodeShare(new URLSearchParams(search))), [search]);

  if (!decoded) return null;
  if (!decoded.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">{t("shared.errorTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("shared.errorBody")}</p>
        <Button asChild className="mt-6"><Link to="/start">{t("shared.retake")}</Link></Button>
      </div>
    );
  }
  const { data } = decoded;
  const scores = computeScores(data.answers);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t("shared.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("shared.lead")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("results.role", { role: t(`roles.${data.role}`) })}</p>
      </header>
      <ResultSummary scores={scores} />
      <section className="panel">
        <h2 className="eyebrow">{t("results.dimensionsTitle")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {scores.dimensions.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3">
              <span>{t(`dimensions.${d.id}`)}</span>
              <LevelBadge level={d.level} />
            </li>
          ))}
        </ul>
      </section>
      <Button asChild size="xl"><Link to="/">{t("shared.cta")}</Link></Button>
      <Disclaimer />
    </div>
  );
}
