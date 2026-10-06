import { describe, expect, it } from "vitest";
import type { NodeId } from "@/data/nodes";
import { fill, withAnswers } from "@/test/fixtures";
import { recommend } from "./recommend";

type Overrides = Parameters<typeof withAnswers>[1];

/** Run the engine for 5to15 teams unless stated otherwise. */
const run = (overrides: Overrides, team: "lt5" | "5to15" | "gt15" = "5to15") =>
  recommend(withAnswers(4, overrides), team);

describe("recommendation engine: appendix A vectors", () => {
  it("T8: N1 achieved; now = N2; no next; deferred = N5 missing N4 (upstream N3, N2)", () => {
    const r = run({ q01: 2, q18: 3, q02: 1, q03: 1, q04: 1, q20: 1, q11: 3, q19: 3 });
    expect(r.statuses.N1).toBe("achieved");
    expect(r.now).toBe("N2");
    expect(r.next).toBeNull();
    expect(r.deferred?.node).toBe("N5");
    expect(r.deferred?.missing).toEqual(["N4"]);
    expect(r.deferred?.upstream).toEqual(["N3", "N2"]);
    expect([r.now, r.next]).not.toContain("N5");
  });

  describe("stop the bleeding: N9 first when q11 or q19 ≤ 2 and N9 is a candidate", () => {
    it("T9: q11 = 2, all others 4 → N1 achieved, N9 candidate, N9 first", () => {
      const r = run({ q11: 2 }, "gt15");
      expect(r.statuses.N1).toBe("achieved");
      expect(r.statuses.N9).toBe("candidate");
      expect(r.now).toBe("N9");
    });

    it("T9b: q01 = 1, q11 = 1, all others 4 → N1 now; N9 blocked and in neither now nor next", () => {
      const r = run({ q01: 1, q11: 1 });
      expect(r.statuses.N1).toBe("candidate");
      expect(r.statuses.N9).toBe("blocked");
      expect(r.now).toBe("N1");
      expect(r.next).toBeNull();
      expect([r.now, r.next]).not.toContain("N9");
    });

    // The first row is the previous (stronger) form of T9: a lower-scoring candidate (N6, q05 = 1) must not outrank N9.
    it.each<{ name: string; overrides: Overrides; now: NodeId; next: NodeId | null }>([
      {
        name: "q11 = 2 beats a lower-scoring candidate",
        overrides: { q11: 2, q05: 1 },
        now: "N9",
        next: "N6",
      },
      {
        name: "q19 ≤ 2 also triggers it (N9 trigger score 2 vs N6 score 1)",
        overrides: { q19: 2, q10: 2, q05: 1 },
        now: "N9",
        next: "N6",
      },
      {
        name: "'unsure' on q11 counts as level 1",
        overrides: { q11: 0, q05: 2 },
        now: "N9",
        next: "N6",
      },
    ])("$name", ({ overrides, now, next }) => {
      const r = run(overrides, "gt15");
      expect(r.statuses.N9).toBe("candidate");
      expect(r.now).toBe(now);
      expect(r.next).toBe(next);
    });

    it("does not apply when q11 and q19 are both ≥ 3 (N9 then ranks by trigger score)", () => {
      const r = run({ q10: 2, q05: 1 });
      expect(r.statuses.N9).toBe("candidate");
      expect(r.now).toBe("N6");
      expect(r.next).toBe("N9");
    });
  });
});

describe("recommendation engine: node status definitions", () => {
  it("achieved = conditions hold; candidate = not achieved, prerequisites achieved; blocked = a prerequisite is missing", () => {
    const r = run({ q01: 2, q02: 2 }); // N1 ok, N2 candidate (q01 < 3), N3 blocked by N2 (and q02 < 3)
    expect(r.statuses.N1).toBe("achieved");
    expect(r.statuses.N2).toBe("candidate");
    expect(r.statuses.N3).toBe("blocked");
  });

  it("achievement depends only on the node's own conditions, not on its prerequisites", () => {
    // q01 = 1: N2 and N1 fail. N3's own condition (q02 ≥ 3) holds, so N3 is achieved even though N2 is not.
    const r = run({ q01: 1 });
    expect(r.statuses.N3).toBe("achieved");
    expect(r.statuses.N2).toBe("blocked");
  });

  it("N11 needs basic CI/CD (q12 ≥ 2): q12 = 1 → blocked with a missing condition, q12 = 2 → candidate", () => {
    const blocked = run({ q12: 1 });
    expect(blocked.statuses.N11).toBe("blocked");
    expect(blocked.now).toBeNull();
    expect(blocked.deferred?.node).toBe("N11");
    expect(blocked.deferred?.missing).toEqual([]);
    expect(blocked.deferred?.missingConditions).toEqual([{ q: "q12", min: 2 }]);

    const candidate = run({ q12: 2 });
    expect(candidate.statuses.N11).toBe("candidate");
    expect(candidate.now).toBe("N11");
  });

  it("everything achieved → all clear, nothing recommended", () => {
    const r = recommend(fill(4), "gt15");
    expect(r.allClear).toBe(true);
    expect(r.now).toBeNull();
    expect(r.next).toBeNull();
    expect(r.deferred).toBeNull();
  });

  it("all clear is false while any node is a candidate or blocked", () => {
    expect(run({ q13: 2 }).allClear).toBe(false);
  });
});

describe("recommendation engine: ordering rules", () => {
  it("foundation chain (N1→N5) comes before other candidates, even with a lower trigger score", () => {
    // N4 candidate (q03 = 2), N6 candidate with a lower trigger score (q05 = 1)
    const r = run({ q03: 2, q05: 1 });
    expect(r.statuses.N4).toBe("candidate");
    expect(r.statuses.N6).toBe("candidate");
    expect(r.now).toBe("N4");
    expect(r.next).toBe("N6");
  });

  it("other candidates sort by lowest trigger score, ties by lower node number", () => {
    const r = run({ q05: 2, q13: 1, q16: 1 }); // N6 score 2, N15 score 1, N16 score 1
    expect(r.now).toBe("N15");
    expect(r.next).toBe("N16");
  });

  it("recommends at most two actions plus one deferred item", () => {
    const r = run({ q05: 1, q13: 1, q16: 1, q07: 1 });
    const picked = [r.now, r.next].filter(Boolean);
    expect(picked).toHaveLength(2);
    expect(Object.values(r.statuses).filter((s) => s === "candidate").length).toBeGreaterThan(2);
  });
});

describe("recommendation engine: blocked nodes are deferred, never recommended", () => {
  it("defers the blocked node with the lowest trigger score, even when its chain is shorter", () => {
    // N3 blocked: trigger 1, chain 1. N4 blocked: trigger 2, chain 2. N5 blocked: trigger 2, chain 3.
    const r = run({ q01: 2, q02: 1, q03: 2 });
    expect(r.now).toBe("N2");
    expect(r.deferred?.node).toBe("N3");
  });

  it("on equal trigger scores defers the node furthest from its prerequisites (T8: N5 over N4 and N3)", () => {
    const r = run({ q01: 2, q02: 1, q03: 1, q04: 1, q20: 1 });
    expect(r.deferred?.node).toBe("N5");
  });

  it("then falls back to the lower node number (T9b: N2 and N9 are equally far and equally weak)", () => {
    const r = run({ q01: 1, q11: 1 });
    expect(r.deferred?.node).toBe("N2");
    expect([r.now, r.next]).not.toContain(r.deferred?.node);
  });

  it("never recommends a blocked node as now or next", () => {
    const r = run({ q01: 1, q11: 1, q02: 1, q03: 1, q04: 1 });
    for (const id of [r.now, r.next]) if (id) expect(r.statuses[id]).toBe("candidate");
  });
});

describe("recommendation engine: team size", () => {
  // The small-team rule changes how the next level of a dimension is shown (see dimensionInsight), not the capability ranking.
  it.each([{ q05: 1 }, { q18: 3 }, { q16: 2, q11: 2 }] as Overrides[])(
    "lt5 ranks like gt15 for %j",
    (overrides) => {
      const small = run(overrides, "lt5");
      const large = run(overrides, "gt15");
      expect({ now: small.now, next: small.next, deferred: small.deferred }).toEqual({
        now: large.now,
        next: large.next,
        deferred: large.deferred,
      });
      expect(small.team).toBe("lt5");
    },
  );
});

describe("deferred ordering uses depth, not the number of unmet nodes", () => {
  it.each([
    { name: "two shallow branches lose to a two-step chain", overrides: { q18: 2, q03: 1, q04: 1, q05: 1, q06: 1, q07: 1, q08: 1, q20: 1 }, expected: "N13" },
    { name: "three-step foundation chain remains longest", overrides: { q01: 2, q02: 1, q03: 1, q04: 1, q20: 1 }, expected: "N5" },
  ] as const)("$name", ({ overrides, expected }) => {
    expect(run(overrides).deferred?.node).toBe(expected);
  });
});
