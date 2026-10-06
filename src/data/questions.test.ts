import { describe, expect, it } from "vitest";
import enQuestions from "@/locales/en/questions.json";
import zhQuestions from "@/locales/zh-TW/questions.json";
import { QUESTIONS, allowsUnsure, questionIndex, type QuestionId, type Role } from "./questions";
import { DIMENSION_IDS } from "./dimensions";

const ids = (...nums: number[]) =>
  nums.map((n) => `q${String(n).padStart(2, "0")}`) as QuestionId[];

describe("question bank (spec §5)", () => {
  it("has q01–q20 in order, which is also the share-code order", () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual(ids(...Array.from({ length: 20 }, (_, i) => i + 1)));
    QUESTIONS.forEach((q, i) => expect(questionIndex(q.id)).toBe(i));
  });

  it.each([
    ["d1", ids(1, 2, 3, 4)],
    ["d2", ids(5, 6, 7, 8)],
    ["d3", ids(9, 10, 11)],
    ["d4", ids(12, 13, 14)],
    ["d5", ids(15, 16, 17)],
    ["d6", ids(18, 19, 20)],
  ] as const)("dimension %s owns %j", (dim, expected) => {
    expect(QUESTIONS.filter((q) => q.dimension === dim).map((q) => q.id)).toEqual(expected);
  });

  it("has six dimensions d1–d6", () => {
    expect(DIMENSION_IDS).toEqual(["d1", "d2", "d3", "d4", "d5", "d6"]);
  });

  it("has 14 scenario and 6 evidence questions (q04, q08, q11, q14, q17, q20)", () => {
    expect(QUESTIONS.filter((q) => q.kind === "scenario")).toHaveLength(14);
    expect(QUESTIONS.filter((q) => q.kind === "evidence").map((q) => q.id)).toEqual(
      ids(4, 8, 11, 14, 17, 20),
    );
  });

  // Spec table 「題庫彙整」: which role is offered an "unsure" / "no data" option.
  const unsureTable: Record<Role, QuestionId[]> = {
    manager: ids(11, 14),
    engineer: ids(2, 3, 8, 11, 14, 18, 20),
  };
  it.each(["manager", "engineer"] as const)(
    "%s is offered 'unsure' exactly where the spec says",
    (role) => {
      expect(QUESTIONS.filter((q) => allowsUnsure(q, role)).map((q) => q.id)).toEqual(
        unsureTable[role],
      );
    },
  );

  it("T6: q02 offers 'unsure' to engineers but not to managers", () => {
    const q02 = QUESTIONS[questionIndex("q02")]!;
    expect(q02.unsure.engineer).toBe(true);
    expect(q02.unsure.manager).toBe(false);
  });
});

describe.each([
  ["zh-TW", zhQuestions],
  ["en", enQuestions],
] as const)("question text (%s)", (_locale, text) => {
  type Entry = {
    title?: string;
    stem?: { manager?: string; engineer?: string };
    options?: Record<string, string>;
    unsure?: string;
  };
  const bank = text as unknown as Record<string, Entry>;

  it.each(QUESTIONS.map((q) => q.id))(
    "%s has a title, both stems and options 1–4, all non-empty",
    (id) => {
      const q = bank[id]!;
      expect(q.title).toBeTruthy();
      expect(q.stem?.manager).toBeTruthy();
      expect(q.stem?.engineer).toBeTruthy();
      expect(Object.keys(q.options ?? {}).sort()).toEqual(["1", "2", "3", "4"]);
      Object.values(q.options!).forEach((o) => expect(o).toBeTruthy());
    },
  );

  it("has an 'unsure' text exactly for questions where some role is offered one", () => {
    for (const q of QUESTIONS) {
      const offered = q.unsure.manager || q.unsure.engineer;
      expect(Boolean(bank[q.id]!.unsure), q.id).toBe(offered);
    }
  });

  it("contains no more questions than the bank", () => {
    expect(Object.keys(bank)).toHaveLength(QUESTIONS.length);
  });
});
