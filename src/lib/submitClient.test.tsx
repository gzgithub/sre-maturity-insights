import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validSubmission } from "@/test/fixtures";
import { submissionSchema } from "./submissionSchema";
import { cancelSubmission, retrySubmission, submitWithRetry, useSubmitStatus } from "./submitClient";

const submit = vi.hoisted(() => vi.fn());
vi.mock("./submit.functions", () => ({ submitAssessment: submit }));
const payload = () => submissionSchema.parse(validSubmission());
const deferred = () => {
  let resolve!: (value: { ok: true }) => void;
  const promise = new Promise<{ ok: true }>((r) => { resolve = r; });
  return { promise, resolve };
};

beforeEach(async () => {
  vi.useFakeTimers();
  submit.mockReset().mockResolvedValue({ ok: true });
  cancelSubmission();
});
afterEach(() => {
  act(() => cancelSubmission());
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("submission lifecycle", () => {
  it("bounds a hanging first request so results can still open", async () => {
    submit.mockImplementation(() => new Promise(() => {}));
    let outcome: boolean | undefined;
    void submitWithRetry(payload(), () => {}).then((ok) => { outcome = ok; });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(outcome).toBe(false);
  });

  it("ends in failed after the finite retry budget is exhausted", async () => {
    submit.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSubmitStatus());
    await act(async () => {
      expect(await submitWithRetry(payload(), () => {})).toBe(false);
      await vi.advanceTimersByTimeAsync(185_000);
    });
    expect(result.current).toBe("failed");
    expect(submit).toHaveBeenCalledTimes(5);
  });

  it("snapshots answers instead of sending later edits with an old consent", async () => {
    submit.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ ok: true });
    const data = payload();
    await submitWithRetry(data, () => {});
    data.answers[0] = 1;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(submit.mock.calls[1]![0].data.answers[0]).toBe(3);
  });

  it("ignores a superseded request that completes after the new submission", async () => {
    const old = deferred();
    submit.mockReturnValueOnce(old.promise).mockResolvedValue({ ok: true });
    const oldSaved = vi.fn();
    const newSaved = vi.fn();
    const first = submitWithRetry(payload(), oldSaved);
    expect(await submitWithRetry(payload(), newSaved)).toBe(true);
    old.resolve({ ok: true });
    await first;
    expect(oldSaved).not.toHaveBeenCalled();
    expect(newSaved).toHaveBeenCalledTimes(1);
  });
});

describe("submission cancellation and recovery", () => {
  it("manual retry reuses the original consent and id", async () => {
    submit.mockRejectedValue(new Error("offline"));
    const data = payload();
    const onSaved = vi.fn();
    await submitWithRetry(data, onSaved);
    await vi.advanceTimersByTimeAsync(185_000);
    submit.mockResolvedValue({ ok: true });
    expect(await retrySubmission()).toBe(true);
    expect(submit.mock.calls.at(-1)![0].data).toEqual(data);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("a canceled hanging request settles without touching the current assessment", async () => {
    submit.mockImplementation(() => new Promise(() => {}));
    const onSaved = vi.fn();
    const request = submitWithRetry(payload(), onSaved);
    cancelSubmission();
    expect(await request).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
