import { DIMENSION_IDS, type DimensionId } from "@/data/dimensions";
import { QUESTIONS, type QuestionId, type TeamSize } from "@/data/questions";

export type Level = 1 | 2 | 3 | 4;
/** 20 integers 0–4, in QUESTIONS order. 0 = unsure / no data. */
export type Answers = readonly number[];

/** "Unsure" counts as 1. */
export const answerValue = (a: number): number => (a === 0 ? 1 : a);

export function scoreToLevel(score: number): Level {
  if (score < 1.75) return 1;
  if (score < 2.5) return 2;
  if (score < 3.25) return 3;
  return 4;
}

export interface DimensionScore {
  id: DimensionId;
  selfReported: number;
  calibrated: number;
  level: Level;
  /** Scenario average minus evidence score ≥ 1.5. */
  gap: boolean;
}

export interface ScoreResult {
  dimensions: DimensionScore[];
  overallScore: number;
  rawLevel: Level;
  overallLevel: Level;
  capped: boolean;
  limitingDimensions: DimensionId[];
  transparencyGaps: QuestionId[];
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function computeScores(answers: Answers): ScoreResult {
  if (answers.length !== QUESTIONS.length) throw new Error("answers must have 20 entries");

  const dimensions: DimensionScore[] = DIMENSION_IDS.map((dim) => {
    const items = QUESTIONS.map((q, i) => ({ q, v: answerValue(answers[i]!) })).filter(
      (x) => x.q.dimension === dim,
    );
    const scenario = items.filter((x) => x.q.kind === "scenario").map((x) => x.v);
    const evidence = items.filter((x) => x.q.kind === "evidence").map((x) => x.v);
    const selfReported = avg(scenario);
    const wSum = items.reduce((s, x) => s + x.q.weight, 0);
    const calibrated = items.reduce((s, x) => s + x.q.weight * x.v, 0) / wSum;
    const gap = evidence.length > 0 && selfReported - avg(evidence) >= 1.5 - 1e-9;
    return { id: dim, selfReported, calibrated, level: scoreToLevel(calibrated), gap };
  });

  const overallScore = avg(dimensions.map((d) => d.calibrated));
  const rawLevel = scoreToLevel(overallScore);
  const weakest = Math.min(...dimensions.map((d) => d.level)) as Level;
  const cap = Math.min(4, weakest + 1) as Level;
  const capped = rawLevel > cap;
  const overallLevel = (capped ? cap : rawLevel) as Level;
  const limitingDimensions = capped
    ? dimensions.filter((d) => d.level === weakest).map((d) => d.id)
    : [];
  const transparencyGaps = QUESTIONS.filter((_, i) => answers[i] === 0).map((q) => q.id);

  return { dimensions, overallScore, rawLevel, overallLevel, capped, limitingDimensions, transparencyGaps };
}

export interface DimensionInsight {
  questionId: QuestionId;
  /** Raw answer (0–4) of the weakest question. */
  answer: number;
  /** Next level option to show, or null when already at L4. */
  nextLevel: Level | null;
  /** Small-team rule: PRR / full self-service is not suggested as the next level. */
  smallTeamSkip: boolean;
}

/** Lowest-scoring question in a dimension (ties: lower question number). */
export function dimensionInsight(dim: DimensionId, answers: Answers, team: TeamSize): DimensionInsight {
  let best: { id: QuestionId; i: number; v: number } | null = null;
  QUESTIONS.forEach((q, i) => {
    if (q.dimension !== dim) return;
    const v = answerValue(answers[i]!);
    if (!best || v < best.v) best = { id: q.id, i, v };
  });
  const b = best as unknown as { id: QuestionId; i: number; v: number };
  const nextLevel = b.v >= 4 ? null : ((b.v + 1) as Level);
  const smallTeamSkip = team === "lt5" && nextLevel === 4 && (b.id === "q18" || b.id === "q16");
  return { questionId: b.id, answer: answers[b.i]!, nextLevel, smallTeamSkip };
}
