import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/components/SiteChrome";
import { ROLES, SERVICE_TYPES, TEAM_SIZES, type Role, type ServiceType, type TeamSize } from "@/data/questions";
import { firstUnanswered, useAssessment } from "@/lib/assessmentStore";
import { cn } from "@/lib/utils";
import zh from "@/locales/zh-TW/common.json";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: `${zh.start.title} | ${zh.site.name}` },
      { name: "description", content: zh.start.lead },
      { property: "og:title", content: `${zh.start.title} | ${zh.site.name}` },
      { property: "og:description", content: zh.start.lead },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartPage,
});

function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
  desc,
}: {
  name: string;
  value: T | null;
  options: readonly T[];
  onChange: (v: T) => void;
  label: (v: T) => string;
  desc?: (v: T) => string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={`${name}-label`} className={cn("grid gap-3", desc ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className="option-card flex-col gap-1 py-3">
          <span className="font-medium">{label(o)}</span>
          {desc && <span className="text-sm text-muted-foreground">{desc(o)}</span>}
        </button>
      ))}
    </div>
  );
}

function StartPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("start.title"));
  const navigate = useNavigate();
  const { state, hydrated, setProfile } = useAssessment();
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamSize | null>(null);
  const [svc, setSvc] = useState<ServiceType | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setRole(state.role);
    setTeam(state.team);
    setSvc(state.svc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const submit = () => {
    if (!role || !team || !svc) return setShowError(true);
    const willReset = state.role !== null && state.role !== role;
    setProfile({ role, team, svc });
    const first = willReset ? 0 : firstUnanswered(state);
    navigate({ to: first === -1 ? "/contact" : "/q/$n", params: { n: String((first === -1 ? 0 : first) + 1) } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{t("start.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("start.lead")}</p>

      <section className="mt-10 space-y-3">
        <h2 id="role-label" className="eyebrow">{t("start.role")}</h2>
        <Choice name="role" value={role} options={ROLES} onChange={setRole} label={(r) => t(`start.roles.${r}.label`)} desc={(r) => t(`start.roles.${r}.desc`)} />
      </section>
      <section className="mt-8 space-y-3">
        <h2 id="team-label" className="eyebrow">{t("start.team")}</h2>
        <Choice name="team" value={team} options={TEAM_SIZES} onChange={setTeam} label={(v) => t(`start.teams.${v}`)} />
      </section>
      <section className="mt-8 space-y-3">
        <h2 id="svc-label" className="eyebrow">{t("start.svc")}</h2>
        <Choice name="svc" value={svc} options={SERVICE_TYPES} onChange={setSvc} label={(v) => t(`start.svcs.${v}`)} />
      </section>

      {showError && (!role || !team || !svc) && (
        <p role="alert" className="mt-6 text-sm text-destructive">{t("start.required")}</p>
      )}
      <Button size="xl" className="mt-8" onClick={submit}>
        {t("start.continue")}
      </Button>
    </div>
  );
}
