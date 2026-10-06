import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { site } from "@/config/site";
import { ENABLED_LANGUAGES } from "@/i18n/languages";
import { applyLanguage } from "@/i18n";
import { ExternalLink } from "./ExternalLink";

export function SiteHeader() {
  const { t, i18n } = useTranslation();
  return (
    <header className="no-print border-b border-border/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label={t("header.home")}>
          <span className="grid size-7 place-items-center rounded-md bg-primary font-mono text-xs text-primary-foreground" aria-hidden>
            SRE
          </span>
          <span className="text-sm sm:text-base">{t("site.name")}</span>
        </Link>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Languages className="size-4" aria-hidden />
          <span className="sr-only">{t("header.language")}</span>
          <select
            aria-label={t("header.language")}
            value={i18n.resolvedLanguage}
            onChange={(e) => applyLanguage(e.target.value, true)}
            className="rounded-md border border-input bg-background px-2 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ENABLED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.htmlLang}>
                {l.nativeName}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="no-print mt-16 border-t border-border/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>{t("footer.operator", { name: site.operatorName })}</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            {t("footer.privacy")}
          </Link>
          <ExternalLink href={site.blogUrl}>{t("footer.blog")}</ExternalLink>
        </nav>
      </div>
    </footer>
  );
}

export function useDocumentTitle(title?: string) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    const name = t("site.name");
    document.title = title ? `${title} | ${name}` : name;
  }, [title, t, i18n.resolvedLanguage]);
}

export function Disclaimer() {
  const { t } = useTranslation();
  return (
    <p className="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
      {t("disclaimer")}
    </p>
  );
}
