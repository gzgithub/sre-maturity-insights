import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentProvider, useAssessment } from "./assessmentStore";
import { cancelSubmission, submitWithRetry } from "./submitClient";
import { submissionSchema } from "./submissionSchema";
import { fill, validSubmission } from "@/test/fixtures";

const submit = vi.hoisted(() => vi.fn());
vi.mock("./submit.functions", () => ({ submitAssessment: submit }));
const wrapper = ({ children }: { children: ReactNode }) => <AssessmentProvider>{children}</AssessmentProvider>;
const initial = { role: "manager" as const, team: "lt5" as const, svc: "internal" as const };
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  cancelSubmission();
  submit.mockReset().mockRejectedValue(new Error("offline"));
});
afterEach(() => {
  act(() => cancelSubmission());
  vi.clearAllTimers();
  vi.useRealTimers();
});
describe("assessment mutations own cancellation", () => {
  it.each(["retake", "answer", "role", "team", "service"] as const)("cancels retries after changing %s", async (change) => {
    const { result } = renderHook(() => useAssessment(), { wrapper });
    act(() => result.current.setProfile(initial));
    act(() => fill(3).forEach((v, i) => result.current.setAnswer(i, v)));
    const id = result.current.state.submissionId;
    const onSaved = vi.fn(() => result.current.setSubmission("submitted", id));
    await act(async () => {
      await submitWithRetry(submissionSchema.parse(validSubmission({ submissionId: id })), onSaved);
      result.current.setSubmission("attempted", id);
    });
    act(() => {
      switch (change) {
        case "retake": result.current.reset(); break;
        case "answer": result.current.setAnswer(0, 2); break;
        case "role": result.current.setProfile({ ...initial, role: "engineer" }); break;
        case "team": result.current.setProfile({ ...initial, team: "gt15" }); break;
        case "service": result.current.setProfile({ ...initial, svc: "hybrid" }); break;
      }
    });
    submit.mockResolvedValue({ ok: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(200_000); });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.state.submission).toBe("none");
    expect(result.current.state.submissionId).not.toBe(id);
  });

  it("keeps a retry active when the profile values are unchanged", async () => {
    const { result } = renderHook(() => useAssessment(), { wrapper });
    act(() => result.current.setProfile(initial));
    const id = result.current.state.submissionId;
    await act(async () => {
      await submitWithRetry(submissionSchema.parse(validSubmission({ submissionId: id })), () => result.current.setSubmission("submitted", id));
    });
    act(() => result.current.setProfile(initial));
    submit.mockResolvedValue({ ok: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(result.current.state.submission).toBe("submitted");
    expect(result.current.state.submissionId).toBe(id);
  });
});
