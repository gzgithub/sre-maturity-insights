import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AssessmentProvider,
  firstUnanswered,
  isComplete,
  seededShuffle,
  useAssessment,
  type AssessmentState,
} from "./assessmentStore";
import { fill } from "@/test/fixtures";

const KEY = "sre-assessment:progress:v1";
const wrapper = ({ children }: { children: ReactNode }) => (
  <AssessmentProvider>{children}</AssessmentProvider>
);
const setup = async () => {
  const hook = renderHook(() => useAssessment(), { wrapper });
  await waitFor(() => expect(hook.result.current.hydrated).toBe(true));
  return hook;
};
const stored = () => JSON.parse(window.localStorage.getItem(KEY)!) as AssessmentState;

describe("seededShuffle (option order for scenario questions)", () => {
  it("is a permutation of the input and does not mutate it", () => {
    const input = [1, 2, 3, 4];
    const out = seededShuffle(input, 42);
    expect([...out].sort()).toEqual([1, 2, 3, 4]);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it("is deterministic for a seed (a refresh must not reshuffle) and varies across seeds", () => {
    expect(seededShuffle([1, 2, 3, 4], 7)).toEqual(seededShuffle([1, 2, 3, 4], 7));
    const orders = new Set(
      Array.from({ length: 30 }, (_, s) => seededShuffle([1, 2, 3, 4], s + 1).join("")),
    );
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe("progress helpers", () => {
  const state = (answers: (number | null)[]): AssessmentState => ({
    role: "manager",
    team: "lt5",
    svc: "internal",
    answers,
    seed: 1,
    submission: "none",
  });

  it("firstUnanswered finds the first null, or -1 when done", () => {
    expect(firstUnanswered(state([1, 2, null, 3, ...Array(16).fill(1)]))).toBe(2);
    expect(firstUnanswered(state(fill(1)))).toBe(-1);
  });

  it("a questionnaire is complete only with a full profile and 20 answers (0 counts as answered)", () => {
    expect(isComplete(state(fill(0)))).toBe(true);
    expect(isComplete(state([...fill(2).slice(0, 19), null]))).toBe(false);
    expect(isComplete({ ...state(fill(2)), role: null })).toBe(false);
    expect(isComplete({ ...state(fill(2)), team: null })).toBe(false);
    expect(isComplete({ ...state(fill(2)), svc: null })).toBe(false);
  });
});

describe("assessment store", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists only progress: role, team, svc, answers, seed, submission flag (spec §11.4)", async () => {
    const { result } = await setup();
    act(() => result.current.setProfile({ role: "engineer", team: "lt5", svc: "internal" }));
    act(() => result.current.setAnswer(0, 3));
    await waitFor(() =>
      expect(Object.keys(stored()).sort()).toEqual([
        "answers",
        "role",
        "seed",
        "submission",
        "svc",
        "team",
      ]),
    );
    expect(stored().answers[0]).toBe(3);
  });

  it("restores saved progress after a reload", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        role: "manager",
        team: "gt15",
        svc: "external",
        answers: fill(2),
        seed: 9,
        submission: "submitted",
      }),
    );
    const { result } = await setup();
    expect(result.current.state).toMatchObject({
      role: "manager",
      team: "gt15",
      seed: 9,
      submission: "submitted",
    });
  });

  it("ignores corrupt or wrong-length saved data", async () => {
    window.localStorage.setItem(KEY, "{not json");
    expect((await setup()).result.current.state.role).toBeNull();
    window.localStorage.setItem(KEY, JSON.stringify({ role: "manager", answers: [1, 2, 3] }));
    expect((await setup()).result.current.state.role).toBeNull();
  });

  it("changing the role clears all answers and the submitted flag (Appendix B)", async () => {
    const { result } = await setup();
    act(() => result.current.setProfile({ role: "engineer", team: "lt5", svc: "internal" }));
    act(() => fill(2).forEach((v, i) => result.current.setAnswer(i, i === 1 ? 0 : v))); // an engineer-only 'unsure'
    act(() => result.current.setSubmission("submitted"));
    act(() => result.current.setProfile({ role: "manager", team: "lt5", svc: "internal" }));
    expect(result.current.state.answers.every((a) => a === null)).toBe(true);
    expect(result.current.state.submission).toBe("none");
  });

  it("changing only team or service keeps the answers", async () => {
    const { result } = await setup();
    act(() => result.current.setProfile({ role: "manager", team: "lt5", svc: "internal" }));
    act(() => result.current.setAnswer(0, 4));
    act(() => result.current.setProfile({ role: "manager", team: "gt15", svc: "hybrid" }));
    expect(result.current.state.answers[0]).toBe(4);
  });

  it("changing an answer after submitting puts the user back behind the contact gate", async () => {
    const { result } = await setup();
    act(() => result.current.setProfile({ role: "manager", team: "lt5", svc: "internal" }));
    act(() => result.current.setSubmission("submitted"));
    act(() => result.current.setAnswer(3, 2));
    expect(result.current.state.submission).toBe("none");
  });

  it("retaking clears everything and issues a new seed", async () => {
    const { result } = await setup();
    act(() => result.current.setProfile({ role: "manager", team: "lt5", svc: "internal" }));
    act(() => result.current.setAnswer(0, 4));
    act(() => result.current.reset());
    expect(result.current.state).toMatchObject({
      role: null,
      team: null,
      svc: null,
      submission: "none",
    });
    expect(result.current.state.answers.every((a) => a === null)).toBe(true);
    expect(result.current.state.seed).toBeGreaterThan(0);
  });
});
