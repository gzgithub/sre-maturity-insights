import { QUESTIONS, questionIndex, type QuestionId, type Role } from "@/data/questions";
import { DIMENSION_IDS } from "@/data/dimensions";
import type { DimensionId } from "@/data/dimensions";

/** All 20 answers set to `v`. */
export const fill = (v: number): number[] => QUESTIONS.map(() => v);

/** Start from `base` for every question, then override individual questions by id. */
export const withAnswers = (
  base: number,
  overrides: Partial<Record<QuestionId, number>>,
): number[] => {
  const a = fill(base);
  for (const [k, v] of Object.entries(overrides)) a[questionIndex(k as QuestionId)] = v!;
  return a;
};

/** Question ids belonging to a dimension, in order. */
export const questionsOf = (dim: DimensionId): QuestionId[] =>
  QUESTIONS.filter((q) => q.dimension === dim).map((q) => q.id);

/** Set every question of the given dimensions to `value`, everything else to `base`. */
export const withDimensions = (
  base: number,
  dims: Partial<Record<DimensionId, number>>,
): number[] => {
  const a = fill(base);
  for (const dim of DIMENSION_IDS) {
    const v = dims[dim];
    if (v !== undefined) for (const id of questionsOf(dim)) a[questionIndex(id)] = v;
  }
  return a;
};

/** A valid submission payload for the submit function / schema tests. */
export const validSubmission = (overrides: Record<string, unknown> = {}) => ({
  name: "  Ada Lovelace ",
  email: " Ada@Example.COM ",
  consentContact: true,
  consentMarketing: false,
  locale: "en",
  role: "manager" as Role,
  teamSize: "5to15",
  serviceType: "hybrid",
  answers: fill(3),
  consentVersion: "2026-10-v1",
  consentAt: "2026-10-07T00:00:00.000Z",
  appVersion: "0.1.0",
  ...overrides,
});
