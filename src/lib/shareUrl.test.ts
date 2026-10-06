import { describe, expect, it } from "vitest";
import { QUESTIONS, type Role } from "@/data/questions";
import { fill } from "@/test/fixtures";
import { buildShareUrl, decodeShare, encodeShare, SHARE_VERSION, type ShareData } from "./shareUrl";

const BASE = { v: "1", lang: "en", role: "m", team: "lt5", svc: "internal", a: "4".repeat(20) };

/** An answer vector that is valid for `role`: 0 only where that role is offered "unsure". */
const answersFor = (role: Role, raw: number[]) => raw.map((v, i) => (v === 0 && !QUESTIONS[i]!.unsure[role] ? 2 : v));

describe("share URL: encode / decode (T7)", () => {
  const raw = [3, 2, 4, 1, 0, 2, 4, 3, 0, 1, 3, 3, 0, 2, 1, 4, 2, 1, 3, 0];

  it.each<ShareData>([
    { lang: "zh-TW", role: "engineer", team: "5to15", svc: "hybrid", answers: answersFor("engineer", raw) },
    { lang: "en", role: "manager", team: "lt5", svc: "internal", answers: answersFor("manager", raw) },
    { lang: "en", role: "manager", team: "gt15", svc: "external", answers: fill(1) },
    { lang: "zh-TW", role: "engineer", team: "gt15", svc: "external", answers: fill(4) },
  ])("round-trips exactly: $role / $team / $svc", (data) => {
    expect(decodeShare(new URLSearchParams(encodeShare(data)))).toEqual({ ok: true, data });
  });

  it("round-trips an engineer's 'unsure' answers where the engineer is offered them", () => {
    const answers = fill(3);
    for (const id of ["q02", "q03", "q08", "q11", "q14", "q18", "q20"]) answers[QUESTIONS.findIndex((q) => q.id === id)] = 0;
    const data: ShareData = { lang: "en", role: "engineer", team: "5to15", svc: "hybrid", answers };
    expect(decodeShare(new URLSearchParams(encodeShare(data)))).toEqual({ ok: true, data });
  });
});

describe("share URL: format (§9)", () => {
  const data: ShareData = { lang: "zh-TW", role: "manager", team: "5to15", svc: "hybrid", answers: fill(3) };

  it("uses exactly v, lang, role, team, svc and a: nothing that could identify a person", () => {
    const params = new URLSearchParams(encodeShare(data));
    expect([...params.keys()].sort()).toEqual(["a", "lang", "role", "svc", "team", "v"]);
    expect(params.get("v")).toBe(SHARE_VERSION);
  });

  it("encodes the role as m / e and the answers as exactly 20 characters of 0–4", () => {
    expect(new URLSearchParams(encodeShare(data)).get("role")).toBe("m");
    expect(new URLSearchParams(encodeShare({ ...data, role: "engineer" })).get("role")).toBe("e");
    expect(new URLSearchParams(encodeShare(data)).get("a")).toMatch(/^[0-4]{20}$/);
  });

  it("builds /r?… URLs on the given origin", () => {
    expect(buildShareUrl("https://example.test", data)).toBe(`https://example.test/r?${encodeShare(data)}`);
  });
});

describe("share URL: strict validation (§9)", () => {
  it("accepts the baseline", () => {
    expect(decodeShare(BASE).ok).toBe(true);
  });

  it.each<[string, Record<string, string | undefined>]>([
    ["T7: 19 answers", { a: "4".repeat(19) }],
    ["T7: 21 answers", { a: "4".repeat(21) }],
    ["T7: a '5' as the last answer", { a: "4".repeat(19) + "5" }],
    ["a '5' in the middle", { a: "4".repeat(10) + "5" + "4".repeat(9) }],
    ["a letter", { a: "4".repeat(19) + "x" }],
    ["a minus sign", { a: "4".repeat(19) + "-" }],
    ["whitespace inside the code", { a: "4".repeat(19) + " " }],
    ["empty answers", { a: "" }],
    ["missing answers", { a: undefined }],
    ["T7: unknown version", { v: "2" }],
    ["missing version", { v: undefined }],
    ["unsupported language", { lang: "fr" }],
    ["missing language", { lang: undefined }],
    ["role spelled out", { role: "manager" }],
    ["unknown role", { role: "x" }],
    ["missing role", { role: undefined }],
    ["unknown team size", { team: "huge" }],
    ["missing team size", { team: undefined }],
    ["unknown service type", { svc: "saas" }],
    ["missing service type", { svc: undefined }],
  ])("rejects: %s", (_name, override) => {
    const input = { ...BASE, ...override };
    for (const k of Object.keys(input) as (keyof typeof input)[]) if (input[k] === undefined) delete input[k];
    expect(decodeShare(input).ok).toBe(false);
  });

  // Appendix B: "0" (unsure) is only valid where the role is offered an unsure option.
  it.each<{ role: "m" | "e"; q: string; ok: boolean }>([
    { role: "m", q: "q02", ok: false },
    { role: "e", q: "q02", ok: true },
    { role: "e", q: "q01", ok: false },
    { role: "m", q: "q11", ok: true },
    { role: "e", q: "q11", ok: true },
    { role: "m", q: "q18", ok: false },
    { role: "e", q: "q20", ok: true },
  ])("a 0 on $q with role=$role is accepted: $ok", ({ role, q, ok }) => {
    const chars = "4".repeat(20).split("");
    chars[QUESTIONS.findIndex((x) => x.id === q)] = "0";
    expect(decodeShare({ ...BASE, role, a: chars.join("") }).ok).toBe(ok);
  });

  it("does not mistake a share link for personal data input: unknown extra parameters are ignored", () => {
    const r = decodeShare(new URLSearchParams({ ...BASE, name: "Ada", email: "ada@example.com" }));
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/Ada|example\.com/);
  });
});
