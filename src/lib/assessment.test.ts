import { describe, expect, it } from "vitest";
import { QUESTIONS, questionIndex, type QuestionId } from "@/data/questions";
import { computeScores, dimensionInsight } from "./scoring";
import { recommend } from "./recommend";
import { decodeShare, encodeShare } from "./shareUrl";
import { contactSchema, isHoneypotTriggered } from "./submissionSchema";

const fill = (v: number) => QUESTIONS.map(() => v);
const withAnswers = (base: number, overrides: Partial<Record<QuestionId, number>>) => {
  const a = fill(base);
  for (const [k, v] of Object.entries(overrides)) a[questionIndex(k as QuestionId)] = v!;
  return a;
};

describe("scoring", () => {
  it("T1: all 4 → every dimension 4.0, overall L4, no cap", () => {
    const r = computeScores(fill(4));
    r.dimensions.forEach((d) => expect(d.calibrated).toBe(4));
    expect(r.overallLevel).toBe(4);
    expect(r.capped).toBe(false);
  });
  it("T2: all 1 → every dimension 1.0, overall L1", () => {
    const r = computeScores(fill(1));
    r.dimensions.forEach((d) => expect(d.calibrated).toBe(1));
    expect(r.overallLevel).toBe(1);
  });
  it("T3: all 2 → every dimension 2.0, overall L2", () => {
    const r = computeScores(fill(2));
    r.dimensions.forEach((d) => expect(d.calibrated).toBe(2));
    expect(r.overallLevel).toBe(2);
  });
  it("T4: d1–d5 all 4, d6 all 1 → raw 3.5 (L4) capped to L2 by d6", () => {
    const r = computeScores(withAnswers(4, { q18: 1, q19: 1, q20: 1 }));
    expect(r.overallScore).toBeCloseTo(3.5);
    expect(r.rawLevel).toBe(4);
    expect(r.overallLevel).toBe(2);
    expect(r.capped).toBe(true);
    expect(r.limitingDimensions).toEqual(["d6"]);
  });
  it("T5: q01–q03 = 4, q04 = 1 → d1 self 4.0, calibrated 3.0, gap shown", () => {
    const r = computeScores(withAnswers(4, { q04: 1 }));
    const d1 = r.dimensions.find((d) => d.id === "d1")!;
    expect(d1.selfReported).toBe(4);
    expect(d1.calibrated).toBeCloseTo(3.0);
    expect(d1.gap).toBe(true);
  });
  it("T6: engineer q02 unsure → counts 1, listed as transparency gap; manager has no unsure on q02", () => {
    const a = withAnswers(4, { q02: 0 });
    const r = computeScores(a);
    expect(r.transparencyGaps).toEqual(["q02"]);
    const d1 = r.dimensions.find((d) => d.id === "d1")!;
    expect(d1.selfReported).toBeCloseTo((4 + 1 + 4) / 3);
    const q02 = QUESTIONS[questionIndex("q02")]!;
    expect(q02.unsure.engineer).toBe(true);
    expect(q02.unsure.manager).toBe(false);
  });
});

describe("share URL", () => {
  it("T7: encode → decode round-trips exactly", () => {
    const answers = [3, 2, 4, 1, 0, 2, 4, 3, 0, 1, 3, 3, 0, 2, 1, 4, 2, 1, 3, 0].map((v, i) =>
      v === 0 && !QUESTIONS[i]!.unsure.engineer ? 2 : v,
    );
    const data = { lang: "zh-TW", role: "engineer" as const, team: "5to15" as const, svc: "hybrid" as const, answers };
    const r = decodeShare(new URLSearchParams(encodeShare(data)));
    expect(r).toEqual({ ok: true, data });
  });
  it("T7: rejects wrong length or a '5'", () => {
    const base = { v: "1", lang: "en", role: "m", team: "lt5", svc: "internal" };
    expect(decodeShare({ ...base, a: "4".repeat(19) }).ok).toBe(false);
    expect(decodeShare({ ...base, a: "4".repeat(19) + "5" }).ok).toBe(false);
    expect(decodeShare({ ...base, v: "2", a: "4".repeat(20) }).ok).toBe(false);
    expect(decodeShare({ ...base, a: "4".repeat(20) }).ok).toBe(true);
  });
});

describe("recommendation engine", () => {
  it("T8: N1 achieved; now = N2; no next; deferred = N5 missing N4 (upstream N3, N2)", () => {
    const a = withAnswers(4, { q01: 2, q18: 3, q02: 1, q03: 1, q04: 1, q20: 1, q11: 3, q19: 3 });
    const r = recommend(a, "5to15");
    expect(r.statuses.N1).toBe("achieved");
    expect(r.now).toBe("N2");
    expect(r.next).toBeNull();
    expect(r.deferred?.node).toBe("N5");
    expect(r.deferred?.missing).toEqual(["N4"]);
    expect(r.deferred?.upstream).toEqual(["N3", "N2"]);
    expect([r.now, r.next]).not.toContain("N5");
  });
  it("T9: q11 = 2 with N9 candidate → N9 comes first", () => {
    const r = recommend(withAnswers(4, { q11: 2, q05: 1 }), "gt15");
    expect(r.statuses.N9).toBe("candidate");
    expect(r.now).toBe("N9");
  });
  it("T10: team lt5 with q18 = 3 → next level is not PRR, marked as skippable", () => {
    const a = withAnswers(4, { q18: 3 });
    const small = dimensionInsight("d6", a, "lt5");
    expect(small.questionId).toBe("q18");
    expect(small.smallTeamSkip).toBe(true);
    expect(dimensionInsight("d6", a, "gt15").smallTeamSkip).toBe(false);
  });
  it("all achieved → all clear", () => {
    const r = recommend(fill(4), "gt15");
    expect(r.allClear).toBe(true);
    expect(r.now).toBeNull();
  });
});

describe("contact gate", () => {
  it("T12: invalid email and missing consent block; honeypot detected", () => {
    const ok = { name: "A", email: "A@Example.com ", consentContact: true, consentMarketing: false };
    const parsed = contactSchema.safeParse(ok);
    expect(parsed.success && parsed.data.email).toBe("a@example.com");
    expect(contactSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, consentContact: false }).success).toBe(false);
    expect(isHoneypotTriggered("bot")).toBe(true);
    expect(isHoneypotTriggered("")).toBe(false);
  });
});
