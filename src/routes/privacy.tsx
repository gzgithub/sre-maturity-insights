import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "@/components/SiteChrome";
import { site } from "@/config/site";
import zh from "@/locales/zh-TW/legal.json";
import zhCommon from "@/locales/zh-TW/common.json";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `${zh.privacy.title} | ${zhCommon.site.name}` },
      { name: "description", content: zh.privacy.separate.body },
      { property: "og:title", content: `${zh.privacy.title} | ${zhCommon.site.name}` },
      { property: "og:description", content: zh.privacy.separate.body },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS = ["separate", "collected", "purpose", "retention", "rights", "storage", "processor", "share", "contact"] as const;

function PrivacyPage() {
  const { t } = useTranslation("legal");
  useDocumentTitle(t("privacy.title"));
  const vars = { operator: site.operatorName, email: site.contactEmail, retention: site.retentionPeriod };
  return (
    <article className="prose-legal mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{t("privacy.title")}</h1>
      <p className="eyebrow mt-3">{t("privacy.version", { version: site.consentVersion })}</p>
      <p className="mt-6">{t("privacy.intro", vars)}</p>
      {SECTIONS.map((s) => (
        <section key={s} className={s === "separate" ? "panel mt-8" : "mt-8"}>
          <h2 className="text-lg font-semibold">{t(`privacy.${s}.title`)}</h2>
          <p className="mt-2">{t(`privacy.${s}.body`, vars)}</p>
        </section>
      ))}
    </article>
  );
}
