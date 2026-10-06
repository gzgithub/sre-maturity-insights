import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/data/questions";
import { fill, withAnswers, withDimensions } from "@/test/fixtures";
import { answerValue, computeScores, dimensionInsight, scoreToLevel, type Level } from "./scoring";

const dim = (r: ReturnType<typeof computeScores>, id: string) =>
  r.dimensions.find((d) => d.id === id)!;

describe("scoring: appendix A vectors", () => {
  // T1–T3: uniform answers give uniform dimension scores and the same overall level.
  it.each([
    { id: "T1", value: 4, level: 4 },
    { id: "T2", value: 1, level: 1 },
    { id: "T3", value: 2, level: 2 },
  ])("$id: all $value → every dimension $value.0, overall L$level, no cap", ({ value, level }) => {
    const r = computeScores(fill(value));
    r.dimensions.forEach((d) => {
      expect(d.calibrated).toBe(value);
      expect(d.selfReported).toBe(value);
    });
    expect(r.overallLevel).toBe(level);
    expect(r.capped).toBe(false);
  });

  it("T4: d1–d5 all 4, d6 all 1 → raw 3.5 (L4) capped to L2 by d6", () => {
    const r = computeScores(withDimensions(4, { d6: 1 }));
    expect(r.overallScore).toBeCloseTo(3.5);
    expect(r.rawLevel).toBe(4);
    expect(r.overallLevel).toBe(2);
    expect(r.capped).toBe(true);
    expect(r.limitingDimensions).toEqual(["d6"]);
  });

  it("T5: q01–q03 = 4, q04 = 1 → d1 self 4.0, calibrated 3.0, gap shown", () => {
    const d1 = dim(computeScores(withAnswers(4, { q04: 1 })), "d1");
    expect(d1.selfReported).toBe(4);
    expect(d1.calibrated).toBeCloseTo((12 + 1.5 * 1) / 4.5);
    expect(d1.calibrated).toBeCloseTo(3.0);
    expect(d1.gap).toBe(true);
  });

  it("T6: unsure counts 1 and is listed as a transparency gap", () => {
    const r = computeScores(withAnswers(4, { q02: 0 }));
    expect(r.transparencyGaps).toEqual(["q02"]);
    expect(dim(r, "d1").selfReported).toBeCloseTo((4 + 1 + 4) / 3);
  });
});

describe("scoring: level thresholds (< 1.75 / < 2.50 / < 3.25)", () => {
  it.each<[number, Level]>([
    [1, 1],
    [1.7499, 1],
    [1.75, 2],
    [2.4999, 2],
    [2.5, 3],
    [3.2499, 3],
    [3.25, 4],
    [4, 4],
  ])("score %s → L%s", (score, level) => {
    expect(scoreToLevel(score)).toBe(level);
  });
});

describe("scoring: self line vs calibrated line", () => {
  it("self line uses scenario questions only, calibrated line weights evidence by 1.5", () => {
    // d1: scenario q01–q03 = 4, evidence q04 = 2
    const d1 = dim(computeScores(withAnswers(4, { q04: 2 })), "d1");
    expect(d1.selfReported).toBe(4);
    expect(d1.calibrated).toBeCloseTo((4 + 4 + 4 + 1.5 * 2) / 4.5);
  });

  it("changing an evidence answer never moves the self line", () => {
    const selfLines = [1, 2, 3, 4].map(
      (v) => dim(computeScores(withAnswers(3, { q04: v })), "d1").selfReported,
    );
    expect(new Set(selfLines)).toEqual(new Set([3]));
  });

  it("evidence questions are the six weight-1.5 questions, the other fourteen weigh 1", () => {
    const evidence = QUESTIONS.filter((q) => q.kind === "evidence");
    expect(evidence.map((q) => q.id)).toEqual(["q04", "q08", "q11", "q14", "q17", "q20"]);
    expect(evidence.every((q) => q.weight === 1.5)).toBe(true);
    const scenario = QUESTIONS.filter((q) => q.kind === "scenario");
    expect(scenario).toHaveLength(14);
    expect(scenario.every((q) => q.weight === 1)).toBe(true);
  });

  it("overall score is the mean of the six calibrated dimension scores", () => {
    const r = computeScores(withAnswers(3, { q04: 1, q11: 4, q20: 2 }));
    const mean = r.dimensions.reduce((s, d) => s + d.calibrated, 0) / 6;
    expect(r.overallScore).toBeCloseTo(mean);
  });
});

describe("scoring: weakest-link cap (overall ≤ weakest dimension level + 1)", () => {
  it.each([
    { weakest: 1, expectedOverall: 2, capped: true },
    { weakest: 2, expectedOverall: 3, capped: true },
    { weakest: 3, expectedOverall: 4, capped: false },
  ])(
    "weakest dimension at L$weakest → overall L$expectedOverall (capped: $capped)",
    ({ weakest, expectedOverall, capped }) => {
      const r = computeScores(withDimensions(4, { d6: weakest }));
      expect(r.rawLevel).toBe(4);
      expect(r.overallLevel).toBe(expectedOverall);
      expect(r.capped).toBe(capped);
      expect(r.limitingDimensions).toEqual(capped ? ["d6"] : []);
    },
  );

  it("reports every dimension tied for weakest as limiting", () => {
    const r = computeScores(withDimensions(4, { d2: 1, d5: 1 }));
    expect(r.capped).toBe(true);
    expect(r.limitingDimensions).toEqual(["d2", "d5"]);
  });
});

describe("scoring: gap hint (scenario average − evidence ≥ 1.5)", () => {
  it.each([
    // d3 = q09, q10 (scenario), q11 (evidence)
    { q09: 4, q10: 3, q11: 2, gap: true, why: "exactly 1.5 counts (3.5 − 2)" },
    { q09: 4, q10: 3, q11: 3, gap: false, why: "0.5 apart" },
    { q09: 4, q10: 4, q11: 2, gap: true, why: "2.0 apart" },
    { q09: 4, q10: 4, q11: 3, gap: false, why: "1.0 apart" },
    { q09: 2, q10: 2, q11: 4, gap: false, why: "evidence better than the description" },
  ])("d3 $q09/$q10 vs evidence $q11 → gap $gap ($why)", ({ q09, q10, q11, gap }) => {
    expect(dim(computeScores(withAnswers(1, { q09, q10, q11 })), "d3").gap).toBe(gap);
  });
});

describe("scoring: unsure answers", () => {
  it("answerValue maps 0 (unsure) to 1 and leaves 1–4 alone", () => {
    expect([0, 1, 2, 3, 4].map(answerValue)).toEqual([1, 1, 2, 3, 4]);
  });

  it("an unsure evidence answer scores 1 and is listed", () => {
    const r = computeScores(withAnswers(4, { q11: 0 }));
    expect(r.transparencyGaps).toEqual(["q11"]);
    expect(dim(r, "d3").calibrated).toBeCloseTo((4 + 4 + 1.5 * 1) / 3.5);
  });

  it("lists every unsure answer in question order", () => {
    expect(computeScores(withAnswers(3, { q20: 0, q02: 0, q14: 0 })).transparencyGaps).toEqual([
      "q02",
      "q14",
      "q20",
    ]);
  });

  it("a real answer of 1 is not a transparency gap", () => {
    expect(computeScores(fill(1)).transparencyGaps).toEqual([]);
  });
});

describe("scoring: input validation", () => {
  it("rejects an answer array that is not 20 long", () => {
    expect(() => computeScores(fill(3).slice(0, 19))).toThrow();
    expect(() => computeScores([...fill(3), 3])).toThrow();
  });
});

describe("dimensionInsight", () => {
  it("picks the lowest-scoring question; ties go to the lower question number", () => {
    expect(dimensionInsight("d1", withAnswers(4, { q02: 2, q03: 2 }), "gt15").questionId).toBe(
      "q02",
    );
    expect(dimensionInsight("d1", withAnswers(4, { q04: 2, q03: 3 }), "gt15").questionId).toBe(
      "q04",
    );
  });

  it("next level is one above the weakest answer, or null at L4", () => {
    expect(dimensionInsight("d2", withAnswers(4, { q06: 2 }), "gt15").nextLevel).toBe(3);
    expect(dimensionInsight("d2", fill(4), "gt15").nextLevel).toBeNull();
  });

  it("an unsure weakest answer keeps the raw 0 but is treated as L1", () => {
    const i = dimensionInsight("d1", withAnswers(4, { q02: 0 }), "gt15");
    expect(i.questionId).toBe("q02");
    expect(i.answer).toBe(0);
    expect(i.nextLevel).toBe(2);
  });

  // T10 and its neighbours: small teams skip the L4 step of q18 (PRR) and q16 (full self-service) only.
  it.each([
    {
      name: "T10: lt5, q18 = 3 → PRR step skippable",
      team: "lt5",
      overrides: { q18: 3 },
      dim: "d6",
      skip: true,
    },
    {
      name: "5to15, q18 = 3 → not skipped",
      team: "5to15",
      overrides: { q18: 3 },
      dim: "d6",
      skip: false,
    },
    {
      name: "gt15, q18 = 3 → not skipped",
      team: "gt15",
      overrides: { q18: 3 },
      dim: "d6",
      skip: false,
    },
    {
      name: "lt5, q16 = 3 → self-service step skippable",
      team: "lt5",
      overrides: { q16: 3 },
      dim: "d5",
      skip: true,
    },
    {
      name: "gt15, q16 = 3 → not skipped",
      team: "gt15",
      overrides: { q16: 3 },
      dim: "d5",
      skip: false,
    },
    {
      name: "lt5, q18 = 2 → next is L3, not L4",
      team: "lt5",
      overrides: { q18: 2 },
      dim: "d6",
      skip: false,
    },
    {
      name: "lt5, q15 = 3 → only q16/q18 are skippable",
      team: "lt5",
      overrides: { q15: 3 },
      dim: "d5",
      skip: false,
    },
  ] as const)("$name", ({ team, overrides, dim, skip }) => {
    const i = dimensionInsight(dim, withAnswers(4, overrides), team);
    expect(i.smallTeamSkip).toBe(skip);
  });

  it("T10: the weakest question is q18 when q18 = 3 and the rest of d6 is 4", () => {
    expect(dimensionInsight("d6", withAnswers(4, { q18: 3 }), "lt5").questionId).toBe("q18");
  });
});
