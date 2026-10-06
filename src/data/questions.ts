import type { DimensionId } from "./dimensions";

export type Role = "manager" | "engineer";
export type TeamSize = "lt5" | "5to15" | "gt15";
export type ServiceType = "internal" | "external" | "hybrid";
export const ROLES: Role[] = ["manager", "engineer"];
export const TEAM_SIZES: TeamSize[] = ["lt5", "5to15", "gt15"];
export const SERVICE_TYPES: ServiceType[] = ["internal", "external", "hybrid"];

export type QuestionId =
  | "q01" | "q02" | "q03" | "q04" | "q05" | "q06" | "q07" | "q08" | "q09" | "q10"
  | "q11" | "q12" | "q13" | "q14" | "q15" | "q16" | "q17" | "q18" | "q19" | "q20";

export interface Question {
  id: QuestionId;
  dimension: DimensionId;
  kind: "scenario" | "evidence";
  weight: number;
  /** Which roles get the "unsure" (answer value 0) option. */
  unsure: Record<Role, boolean>;
}

const S = 1.0;
const E = 1.5;
const none = { manager: false, engineer: false };
const eng = { manager: false, engineer: true };
const both = { manager: true, engineer: true };

/** Order matters: index i corresponds to character i of the share code. */
export const QUESTIONS: Question[] = [
  { id: "q01", dimension: "d1", kind: "scenario", weight: S, unsure: none },
  { id: "q02", dimension: "d1", kind: "scenario", weight: S, unsure: eng },
  { id: "q03", dimension: "d1", kind: "scenario", weight: S, unsure: eng },
  { id: "q04", dimension: "d1", kind: "evidence", weight: E, unsure: none },
  { id: "q05", dimension: "d2", kind: "scenario", weight: S, unsure: none },
  { id: "q06", dimension: "d2", kind: "scenario", weight: S, unsure: none },
  { id: "q07", dimension: "d2", kind: "scenario", weight: S, unsure: none },
  { id: "q08", dimension: "d2", kind: "evidence", weight: E, unsure: both },
  { id: "q09", dimension: "d3", kind: "scenario", weight: S, unsure: none },
  { id: "q10", dimension: "d3", kind: "scenario", weight: S, unsure: none },
  { id: "q11", dimension: "d3", kind: "evidence", weight: E, unsure: both },
  { id: "q12", dimension: "d4", kind: "scenario", weight: S, unsure: none },
  { id: "q13", dimension: "d4", kind: "scenario", weight: S, unsure: none },
  { id: "q14", dimension: "d4", kind: "evidence", weight: E, unsure: both },
  { id: "q15", dimension: "d5", kind: "scenario", weight: S, unsure: none },
  { id: "q16", dimension: "d5", kind: "scenario", weight: S, unsure: none },
  { id: "q17", dimension: "d5", kind: "evidence", weight: E, unsure: none },
  { id: "q18", dimension: "d6", kind: "scenario", weight: S, unsure: eng },
  { id: "q19", dimension: "d6", kind: "scenario", weight: S, unsure: none },
  { id: "q20", dimension: "d6", kind: "evidence", weight: E, unsure: eng },
];

export const QUESTION_COUNT = QUESTIONS.length;

export function questionIndex(id: QuestionId): number {
  return QUESTIONS.findIndex((q) => q.id === id);
}

export function allowsUnsure(q: Question, role: Role): boolean {
  return q.unsure[role];
}
