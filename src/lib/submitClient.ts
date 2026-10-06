import { useSyncExternalStore } from "react";
import type { SubmissionInput } from "./submissionSchema";
import { submitAssessment } from "./submit.functions";

export type SubmitStatus = "idle" | "saving" | "saved" | "retrying" | "failed";
const RETRY_DELAYS = [5_000, 15_000, 45_000, 120_000];
const REQUEST_TIMEOUT = 10_000;
type Job = { id: string; controller: AbortController; payload: SubmissionInput | null; onSaved: (() => void) | null };
let active: Job | null = null;
let status: SubmitStatus = "idle";
const listeners = new Set<() => void>();
const set = (next: SubmitStatus) => { status = next; listeners.forEach((listener) => listener()); };
const current = (job: Job) => active === job && !job.controller.signal.aborted;

/** Cancel pending timers/requests and release contact data when the assessment changes. */
export function cancelSubmission() {
  active?.controller.abort();
  if (active) { active.payload = null; active.onSaved = null; }
  active = null;
  set("idle");
}
export function useSubmitStatus(id?: string) {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => !id || active?.id === id ? status : "idle",
    () => "idle" as SubmitStatus,
  );
}
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const aborted = () => { clearTimeout(timer); reject(new Error("canceled")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", aborted); resolve(); }, ms);
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
  });
}
async function attempt(job: Job) {
  if (!current(job) || !job.payload) throw new Error("canceled");
  const request = new AbortController();
  const abort = () => request.abort();
  job.controller.signal.addEventListener("abort", abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectCancellation: (() => void) | undefined;
  try {
    await Promise.race([
      submitAssessment({ data: job.payload, signal: request.signal }),
      new Promise<never>((_, reject) => {
        rejectCancellation = () => reject(new Error("canceled"));
        job.controller.signal.addEventListener("abort", rejectCancellation, { once: true });
        timer = setTimeout(() => { request.abort(); reject(new Error("timeout")); }, REQUEST_TIMEOUT);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    job.controller.signal.removeEventListener("abort", abort);
    if (rejectCancellation) job.controller.signal.removeEventListener("abort", rejectCancellation);
  }
}
function saved(job: Job): boolean {
  if (!current(job)) return false;
  const callback = job.onSaved;
  job.payload = null;
  job.onSaved = null;
  set("saved");
  callback?.();
  return true;
}
async function retry(job: Job) {
  for (const wait of RETRY_DELAYS) {
    try {
      await delay(wait, job.controller.signal);
      if (!current(job)) return;
      await attempt(job);
      saved(job);
      return;
    } catch { if (!current(job)) return; }
  }
  if (current(job)) set("failed");
}
/** Snapshot contact/consent in memory only; false opens results while finite retries continue. */
export async function submitWithRetry(payload: SubmissionInput, onSaved: () => void): Promise<boolean> {
  cancelSubmission();
  const job: Job = {
    id: payload.submissionId, controller: new AbortController(),
    payload: { ...payload, answers: [...payload.answers] }, onSaved,
  };
  active = job;
  set("saving");
  try { await attempt(job); return saved(job); }
  catch {
    if (!current(job)) return false;
    set("retrying");
    void retry(job);
    return false;
  }
}
/** Explicit retry after exhaustion preserves the original id and consent snapshot. */
export function retrySubmission(): Promise<boolean> {
  if (status !== "failed" || !active?.payload || !active.onSaved) return Promise.resolve(false);
  return submitWithRetry(active.payload, active.onSaved);
}
