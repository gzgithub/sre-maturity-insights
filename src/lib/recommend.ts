import { NODES, FOUNDATION_CHAIN, nodeNumber, type CapabilityNode, type Condition, type NodeId } from "@/data/nodes";
import { questionIndex, type TeamSize } from "@/data/questions";
import { answerValue, type Answers } from "./scoring";

export type NodeStatus = "achieved" | "candidate" | "blocked";

export interface Deferred {
  node: NodeId;
  /** Direct prerequisite capabilities not yet achieved. */
  missing: NodeId[];
  /** Further unmet capabilities upstream of `missing`. */
  upstream: NodeId[];
  /** Non-capability prerequisites not met (e.g. basic CI/CD). */
  missingConditions: Condition[];
}

export interface Recommendation {
  statuses: Record<NodeId, NodeStatus>;
  now: NodeId | null;
  next: NodeId | null;
  deferred: Deferred | null;
  /** No candidates and no blocked capabilities. */
  allClear: boolean;
  team: TeamSize;
}

const byId = new Map(NODES.map((n) => [n.id, n]));
const val = (answers: Answers, c: Condition) => answerValue(answers[questionIndex(c.q)]);
const met = (answers: Answers, c: Condition) => val(answers, c) >= c.min;
const minTrigger = (answers: Answers, n: CapabilityNode) => Math.min(...n.conditions.map((c) => val(answers, c)));

export function recommend(answers: Answers, team: TeamSize): Recommendation {
  const achieved = new Set(NODES.filter((n) => n.conditions.every((c) => met(answers, c))).map((n) => n.id));
  const statuses = {} as Record<NodeId, NodeStatus>;
  for (const n of NODES) {
    if (achieved.has(n.id)) statuses[n.id] = "achieved";
    else {
      const ok = n.prereqNodes.every((p) => achieved.has(p)) && n.prereqConditions.every((c) => met(answers, c));
      statuses[n.id] = ok ? "candidate" : "blocked";
    }
  }
  const candidates = NODES.filter((n) => statuses[n.id] === "candidate");
  const blocked = NODES.filter((n) => statuses[n.id] === "blocked");

  const order: NodeId[] = [];
  // Rule 2: stop the bleeding.
  const q11 = answerValue(answers[questionIndex("q11")]);
  const q19 = answerValue(answers[questionIndex("q19")]);
  if ((q11 <= 2 || q19 <= 2) && statuses.N9 === "candidate") order.push("N9");
  // Rule 3: foundation chain first.
  const chain = FOUNDATION_CHAIN.find((id) => statuses[id] === "candidate" && !order.includes(id));
  if (chain) order.push(chain);
  // Rule 4: remaining candidates by lowest trigger score, then node number.
  candidates
    .filter((n) => !order.includes(n.id))
    .sort((a, b) => minTrigger(answers, a) - minTrigger(answers, b) || nodeNumber(a.id) - nodeNumber(b.id))
    .forEach((n) => order.push(n.id));

  let deferred: Deferred | null = null;
  if (blocked.length > 0) {
    const info = blocked.map((n) => {
      const missing = n.prereqNodes.filter((p) => !achieved.has(p));
      const upstream = unmetAncestors(missing, achieved).filter((x) => !missing.includes(x));
      return {
        n,
        missing,
        upstream,
        chainLen: missing.length + upstream.length,
        missingConditions: n.prereqConditions.filter((c) => !met(answers, c)),
      };
    });
    info.sort(
      (a, b) =>
        minTrigger(answers, a.n) - minTrigger(answers, b.n) ||
        b.chainLen - a.chainLen ||
        nodeNumber(a.n.id) - nodeNumber(b.n.id),
    );
    const top = info[0];
    deferred = { node: top.n.id, missing: top.missing, upstream: top.upstream, missingConditions: top.missingConditions };
  }

  return {
    statuses,
    now: order[0] ?? null,
    next: order[1] ?? null,
    deferred,
    allClear: candidates.length === 0 && blocked.length === 0,
    team,
  };
}

function unmetAncestors(start: NodeId[], achieved: Set<NodeId>): NodeId[] {
  const out: NodeId[] = [];
  const stack = [...start];
  while (stack.length) {
    const id = stack.shift()!;
    if (achieved.has(id) || out.includes(id)) continue;
    out.push(id);
    stack.push(...(byId.get(id)?.prereqNodes ?? []));
  }
  return out;
}
