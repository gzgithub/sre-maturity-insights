import { describe, expect, it } from "vitest";
import enRecs from "@/locales/en/recommendations.json";
import zhRecs from "@/locales/zh-TW/recommendations.json";
import { articlesFor, NODE_ARTICLES } from "./nodeArticles";
import { FOUNDATION_CHAIN, NODES, nodeNumber, type NodeId } from "./nodes";
import { site } from "@/config/site";

type Spec = { id: NodeId; prereqNodes: NodeId[]; prereqConditions?: [string, number][]; conditions: [string, number][] };

// Spec §6.1, transcribed as data. Changing the node table must be a deliberate edit of both.
const SPEC: Spec[] = [
  { id: "N1", prereqNodes: [], conditions: [["q01", 2], ["q18", 2]] },
  { id: "N2", prereqNodes: ["N1"], conditions: [["q01", 3]] },
  { id: "N3", prereqNodes: ["N2"], conditions: [["q02", 3]] },
  { id: "N4", prereqNodes: ["N3"], conditions: [["q03", 3], ["q04", 3]] },
  { id: "N5", prereqNodes: ["N4", "N7"], conditions: [["q03", 4], ["q20", 4]] },
  { id: "N6", prereqNodes: [], conditions: [["q05", 3]] },
  { id: "N7", prereqNodes: [], conditions: [["q18", 3]] },
  { id: "N8", prereqNodes: ["N6"], conditions: [["q06", 3], ["q08", 3]] },
  { id: "N9", prereqNodes: ["N1"], conditions: [["q10", 3], ["q11", 3]] },
  { id: "N10", prereqNodes: ["N3", "N9"], conditions: [["q10", 4]] },
  { id: "N11", prereqNodes: [], prereqConditions: [["q12", 2]], conditions: [["q12", 3], ["q14", 3]] },
  { id: "N12", prereqNodes: ["N7"], conditions: [["q15", 3], ["q17", 3]] },
  { id: "N13", prereqNodes: ["N8"], conditions: [["q07", 3]] },
  { id: "N14", prereqNodes: ["N1"], conditions: [["q09", 3]] },
  { id: "N15", prereqNodes: [], conditions: [["q13", 3]] },
  { id: "N16", prereqNodes: [], conditions: [["q16", 3]] },
  { id: "N17", prereqNodes: ["N7"], conditions: [["q19", 3]] },
];

const pairs = (cs: { q: string; min: number }[]) => cs.map((c) => [c.q, c.min]);

describe("capability nodes (spec §6.1)", () => {
  it("defines N1–N17", () => {
    expect(NODES.map((n) => n.id)).toEqual(SPEC.map((s) => s.id));
    expect(NODES.map((n) => nodeNumber(n.id))).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
  });

  it.each(SPEC)("$id: prerequisites and achievement conditions match the spec", (spec) => {
    const node = NODES.find((n) => n.id === spec.id)!;
    expect(node.prereqNodes).toEqual(spec.prereqNodes);
    expect(pairs(node.prereqConditions)).toEqual(spec.prereqConditions ?? []);
    expect(pairs(node.conditions)).toEqual(spec.conditions);
  });

  it("the foundation chain is N1 → N2 → N3 → N4 → N5", () => {
    expect(FOUNDATION_CHAIN).toEqual(["N1", "N2", "N3", "N4", "N5"]);
  });

  it("has no prerequisite cycles and only refers to nodes that exist", () => {
    const known = new Set(NODES.map((n) => n.id));
    const visit = (id: NodeId, path: NodeId[]) => {
      expect(path, `cycle through ${id}`).not.toContain(id);
      for (const p of NODES.find((n) => n.id === id)!.prereqNodes) {
        expect(known.has(p)).toBe(true);
        visit(p, [...path, id]);
      }
    };
    NODES.forEach((n) => visit(n.id, []));
  });
});

describe.each([
  ["zh-TW", zhRecs],
  ["en", enRecs],
] as const)("recommendation text (%s)", (_l, text) => {
  const recs = text as unknown as Record<string, { name?: string; manager?: string; engineer?: { week?: string; pitch?: string } }>;
  it.each(SPEC.map((s) => s.id))("%s has a name, a manager action and both engineer texts", (id) => {
    expect(recs[id]?.name).toBeTruthy();
    expect(recs[id]?.manager).toBeTruthy();
    expect(recs[id]?.engineer?.week).toBeTruthy();
    expect(recs[id]?.engineer?.pitch).toBeTruthy();
  });
});

describe("blog article pairing (spec §6.4)", () => {
  it("has an entry for every node", () => {
    expect(Object.keys(NODE_ARTICLES).sort()).toEqual(NODES.map((n) => n.id).sort());
  });

  it("falls back to the blog home page until a node is paired", () => {
    for (const n of NODES) if (NODE_ARTICLES[n.id].length === 0) expect(articlesFor(n.id)).toEqual([site.blogUrl]);
  });

  it("only ever links out with absolute https URLs", () => {
    for (const n of NODES) for (const url of articlesFor(n.id)) expect(url).toMatch(/^https:\/\//);
  });
});
