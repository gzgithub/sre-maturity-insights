import { useSyncExternalStore } from "react";
import type { SubmissionInput } from "./submissionSchema";
import { submitAssessment } from "./submit.functions";

/** In-memory only: the payload (with name/email) is never written to storage. */
type Status = "idle" | "saving" | "saved" | "retrying";
let status: Status = "idle";
const listeners = new Set<() => void>();
const set = (s: Status) => {
  status = s;
  listeners.forEach((l) => l());
};

export function useSubmitStatus() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => status,
    () => "idle" as Status,
  );
}

const RETRY_DELAYS = [5_000, 15_000, 45_000, 120_000];

async function attempt(payload: SubmissionInput) {
  await submitAssessment({ data: payload });
}

/** Resolves true on first-attempt success; on failure keeps retrying in the background. */
export async function submitWithRetry(payload: SubmissionInput, onSaved: () => void): Promise<boolean> {
  set("saving");
  try {
    await attempt(payload);
    set("saved");
    onSaved();
    return true;
  } catch {
    set("retrying");
    void (async () => {
      for (const d of RETRY_DELAYS) {
        await new Promise((r) => setTimeout(r, d));
        try {
          await attempt(payload);
          set("saved");
          onSaved();
          return;
        } catch {
          /* keep retrying */
        }
      }
    })();
    return false;
  }
}
