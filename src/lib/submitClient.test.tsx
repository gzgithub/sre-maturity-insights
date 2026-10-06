import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validSubmission } from "@/test/fixtures";
import { submissionSchema } from "./submissionSchema";
import { submitWithRetry, useSubmitStatus } from "./submitClient";

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
  await submitWithRetry(payload(), () => {});
  submit.mockClear();
});
afterEach(() => {
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
