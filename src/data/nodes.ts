import type { QuestionId } from "./questions";

export type NodeId =
  | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | "N7" | "N8" | "N9"
  | "N10" | "N11" | "N12" | "N13" | "N14" | "N15" | "N16" | "N17";

export interface Condition {
  q: QuestionId;
  min: number;
}

export interface CapabilityNode {
  id: NodeId;
  /** Prerequisite capabilities that must be achieved first. */
  prereqNodes: NodeId[];
  /** Prerequisite conditions that are not nodes (e.g. basic CI/CD for N11). */
  prereqConditions: Condition[];
  /** Achievement conditions (also the node's "trigger questions"). */
  conditions: Condition[];
}

const c = (q: QuestionId, min: number): Condition => ({ q, min });

export const NODES: CapabilityNode[] = [
  { id: "N1", prereqNodes: [], prereqConditions: [], conditions: [c("q01", 2), c("q18", 2)] },
  { id: "N2", prereqNodes: ["N1"], prereqConditions: [], conditions: [c("q01", 3)] },
  { id: "N3", prereqNodes: ["N2"], prereqConditions: [], conditions: [c("q02", 3)] },
  { id: "N4", prereqNodes: ["N3"], prereqConditions: [], conditions: [c("q03", 3), c("q04", 3)] },
  { id: "N5", prereqNodes: ["N4", "N7"], prereqConditions: [], conditions: [c("q03", 4), c("q20", 4)] },
  { id: "N6", prereqNodes: [], prereqConditions: [], conditions: [c("q05", 3)] },
  { id: "N7", prereqNodes: [], prereqConditions: [], conditions: [c("q18", 3)] },
  { id: "N8", prereqNodes: ["N6"], prereqConditions: [], conditions: [c("q06", 3), c("q08", 3)] },
  { id: "N9", prereqNodes: ["N1"], prereqConditions: [], conditions: [c("q10", 3), c("q11", 3)] },
  { id: "N10", prereqNodes: ["N3", "N9"], prereqConditions: [], conditions: [c("q10", 4)] },
  { id: "N11", prereqNodes: [], prereqConditions: [c("q12", 2)], conditions: [c("q12", 3), c("q14", 3)] },
  { id: "N12", prereqNodes: ["N7"], prereqConditions: [], conditions: [c("q15", 3), c("q17", 3)] },
  { id: "N13", prereqNodes: ["N8"], prereqConditions: [], conditions: [c("q07", 3)] },
  { id: "N14", prereqNodes: ["N1"], prereqConditions: [], conditions: [c("q09", 3)] },
  { id: "N15", prereqNodes: [], prereqConditions: [], conditions: [c("q13", 3)] },
  { id: "N16", prereqNodes: [], prereqConditions: [], conditions: [c("q16", 3)] },
  { id: "N17", prereqNodes: ["N7"], prereqConditions: [], conditions: [c("q19", 3)] },
];

/** The foundation chain, checked in order (rule 3). */
export const FOUNDATION_CHAIN: NodeId[] = ["N1", "N2", "N3", "N4", "N5"];

export const nodeNumber = (id: NodeId) => Number(id.slice(1));
