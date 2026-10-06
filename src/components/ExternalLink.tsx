import type { ReactNode } from "react";
import { ExternalLink as Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Outbound link: new tab, no referrer, external icon, screen-reader hint. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
    >
      {children}
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{t("footer.external")}</span>
    </a>
  );
}
