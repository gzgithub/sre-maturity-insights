import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocumentTitle } from "@/components/SiteChrome";
import { site } from "@/config/site";
import { firstUnanswered, isComplete, useAssessment } from "@/lib/assessmentStore";
import { contactSchema, isHoneypotTriggered } from "@/lib/submissionSchema";
import { submitWithRetry } from "@/lib/submitClient";
import zh from "@/locales/zh-TW/common.json";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `${zh.contact.title} | ${zh.site.name}` },
      { name: "description", content: zh.contact.lead },
      { property: "og:title", content: `${zh.contact.title} | ${zh.site.name}` },
      { property: "og:description", content: zh.contact.lead },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactPage,
});

type FieldError = "name" | "email" | "consent";

function ContactPage() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t("contact.title"));
  const navigate = useNavigate();
  const { state, hydrated, setSubmission } = useAssessment();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Set<FieldError>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!state.role || !state.team || !state.svc) navigate({ to: "/start", replace: true });
    else if (!isComplete(state)) navigate({ to: "/q/$n", params: { n: String(firstUnanswered(state) + 1) }, replace: true });
  }, [hydrated, state, navigate]);

  if (!hydrated || !isComplete(state)) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ name, email, consentContact: consent, consentMarketing: marketing });
    if (!parsed.success) {
      setErrors(new Set(parsed.error.issues.map((i) => i.message as FieldError)));
      return;
    }
    setErrors(new Set());
    // Honeypot filled: silently discard, never send.
    if (isHoneypotTriggered(website)) {
      setSubmission("submitted");
      navigate({ to: "/results" });
      return;
    }
    setBusy(true);
    const ok = await submitWithRetry(
      {
        ...parsed.data,
        locale: i18n.resolvedLanguage ?? i18n.language,
        role: state.role!,
        teamSize: state.team!,
        serviceType: state.svc!,
        answers: state.answers as number[],
        consentVersion: site.consentVersion,
        consentAt: new Date().toISOString(),
        appVersion: site.appVersion,
      },
      () => setSubmission("submitted"),
    );
    if (!ok) setSubmission("attempted");
    setBusy(false);
    navigate({ to: "/results" });
  };

  const err = (f: FieldError) =>
    errors.has(f) ? (
      <p id={`${f}-error`} role="alert" className="text-sm text-destructive">
        {t(`contact.errors.${f}`)}
      </p>
    ) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{t("contact.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("contact.lead")}</p>
      <ul className="mt-4 space-y-2">
        {(["result", "share", "later"] as const).map((k) => (
          <li key={k} className="flex items-start gap-2">
            <Check className="mt-1 size-4 text-primary" aria-hidden />
            <span>{t(`contact.bullets.${k}`)}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} noValidate className="panel mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t("contact.name")}</Label>
          <Input id="name" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={errors.has("name")} aria-describedby={errors.has("name") ? "name-error" : undefined} />
          {err("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("contact.email")}</Label>
          <Input id="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errors.has("email")} aria-describedby={errors.has("email") ? "email-error" : undefined} />
          {err("email")}
        </div>
        {/* Honeypot: hidden from people and assistive tech. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">{t("contact.honeypot")}</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" aria-invalid={errors.has("consent")} />
            <Label htmlFor="consent" className="font-normal leading-relaxed">
              <Trans
                i18nKey="contact.consent"
                values={{ operator: site.operatorName }}
                components={{ 1: <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-4" /> }}
              />
            </Label>
          </div>
          {err("consent")}
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id="marketing" checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-1" />
          <Label htmlFor="marketing" className="font-normal leading-relaxed">{t("contact.marketing")}</Label>
        </div>
        <p className="text-xs text-muted-foreground">{t("contact.stored")}</p>
        <Button type="submit" size="xl" className="w-full" disabled={busy}>
          {busy ? t("contact.submitting") : t("contact.submit")}
        </Button>
      </form>
    </div>
  );
}
