import { QUESTIONS, SERVICE_TYPES, TEAM_SIZES, type Role, type ServiceType, type TeamSize } from "@/data/questions";
import { ENABLED_CODES } from "@/i18n/languages";

export const SHARE_VERSION = "1";

export interface ShareData {
  lang: string;
  role: Role;
  team: TeamSize;
  svc: ServiceType;
  answers: number[];
}

export type DecodeResult = { ok: true; data: ShareData } | { ok: false; error: string };

/** Query string only (no personal data, ever). */
export function encodeShare(d: ShareData): string {
  const p = new URLSearchParams({
    v: SHARE_VERSION,
    lang: d.lang,
    role: d.role === "manager" ? "m" : "e",
    team: d.team,
    svc: d.svc,
    a: d.answers.join(""),
  });
  return p.toString();
}

export function buildShareUrl(origin: string, d: ShareData): string {
  return `${origin}/r?${encodeShare(d)}`;
}

export function decodeShare(input: URLSearchParams | Record<string, unknown>): DecodeResult {
  const get = (k: string): string | null => {
    if (input instanceof URLSearchParams) return input.get(k);
    const v = input[k];
    return v == null ? null : String(v);
  };
  if (get("v") !== SHARE_VERSION) return { ok: false, error: "version" };
  const lang = get("lang");
  if (!lang || !ENABLED_CODES.includes(lang)) return { ok: false, error: "lang" };
  const r = get("role");
  if (r !== "m" && r !== "e") return { ok: false, error: "role" };
  const role: Role = r === "m" ? "manager" : "engineer";
  const team = get("team") as TeamSize | null;
  if (!team || !TEAM_SIZES.includes(team)) return { ok: false, error: "team" };
  const svc = get("svc") as ServiceType | null;
  if (!svc || !SERVICE_TYPES.includes(svc)) return { ok: false, error: "svc" };
  const a = get("a");
  if (!a || a.length !== QUESTIONS.length || !/^[0-4]+$/.test(a)) return { ok: false, error: "answers" };
  const answers = a.split("").map(Number);
  // "0" is only valid where this role was offered an unsure option.
  if (answers.some((v, i) => v === 0 && !QUESTIONS[i]!.unsure[role])) return { ok: false, error: "answers" };
  return { ok: true, data: { lang, role, team, svc, answers } };
}
