import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { cancelSubmission } from "./submitClient";
import { QUESTIONS, QUESTION_COUNT, type Role, type ServiceType, type TeamSize } from "@/data/questions";

/** Only progress, seed and submission flag are persisted. Never name or email. */
export interface AssessmentState {
  role: Role | null;
  team: TeamSize | null;
  svc: ServiceType | null;
  answers: (number | null)[];
  seed: number;
  submission: "none" | "submitted" | "attempted";
  /** Idempotency key only; never contact data. */
  submissionId: string;
}

const STORAGE_KEY = "sre-assessment:progress:v1";
const newSeed = () => Math.floor(Math.random() * 2 ** 31) + 1;
const empty = (): AssessmentState => ({
  role: null,
  team: null,
  svc: null,
  answers: Array(QUESTION_COUNT).fill(null),
  seed: 0,
  submission: "none",
  submissionId: crypto.randomUUID(),
});

const progressSchema = z.object({
  role: z.enum(["manager", "engineer"]).nullable(),
  team: z.enum(["lt5", "5to15", "gt15"]).nullable(),
  svc: z.enum(["internal", "external", "hybrid"]).nullable(),
  answers: z.array(z.number().int().min(0).max(4).nullable()).length(QUESTION_COUNT),
  seed: z.number().int().min(0).max(2 ** 31).default(0),
  submission: z.enum(["none", "submitted", "attempted"]).default("none"),
  submissionId: z.uuid().optional(),
}).refine((p) => p.answers.every((v, i) => v !== 0 || (p.role !== null && QUESTIONS[i]!.unsure[p.role])));

interface Ctx {
  state: AssessmentState;
  hydrated: boolean;
  setProfile: (p: { role: Role; team: TeamSize; svc: ServiceType }) => void;
  setAnswer: (index: number, value: number) => void;
  setSubmission: (s: AssessmentState["submission"], expectedId?: string) => void;
  reset: () => void;
}

const AssessmentContext = createContext<Ctx | null>(null);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssessmentState>(empty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = progressSchema.safeParse(JSON.parse(raw));
        if (p.success) setState({
          ...p.data,
          submissionId: p.data.submissionId ?? crypto.randomUUID(),
          // A reload loses the contact payload; renewed submission is required.
          submission: p.data.submission === "attempted" ? "none" : p.data.submission,
        });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { /* Disabled/full storage must not break in-memory progress. */ }
  }, [state, hydrated]);

  useEffect(() => cancelSubmission, []);

  const setProfile = useCallback<Ctx["setProfile"]>((p) => {
    if (state.role !== p.role || state.team !== p.team || state.svc !== p.svc) cancelSubmission();
    setState((s) => {
      const roleChanged = s.role !== null && s.role !== p.role;
      // Switching role invalidates "unsure" answers that the other role doesn't offer.
      const answers = roleChanged ? Array(QUESTION_COUNT).fill(null) : s.answers;
      const changed = s.role !== p.role || s.team !== p.team || s.svc !== p.svc;
      return {
        ...s, ...p, answers, seed: s.seed || newSeed(),
        submission: changed ? "none" : s.submission,
        submissionId: changed ? crypto.randomUUID() : s.submissionId,
      };
    });
  }, [state.role, state.team, state.svc]);
  const setAnswer = useCallback((index: number, value: number) => {
    cancelSubmission();
    setState((s) => {
      const answers = [...s.answers];
      answers[index] = value;
      return { ...s, answers, submission: "none", submissionId: crypto.randomUUID() };
    });
  }, []);
  const setSubmission = useCallback<Ctx["setSubmission"]>((submission, expectedId) => {
    setState((s) => expectedId && s.submissionId !== expectedId ? s : { ...s, submission });
  }, []);
  const reset = useCallback(() => {
    cancelSubmission();
    setState({ ...empty(), seed: newSeed() });
  }, []);

  const value = useMemo(
    () => ({ state, hydrated, setProfile, setAnswer, setSubmission, reset }),
    [state, hydrated, setProfile, setAnswer, setSubmission, reset],
  );
  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used inside AssessmentProvider");
  return ctx;
}

export const firstUnanswered = (s: AssessmentState) => s.answers.findIndex((a) => a === null);
export const isComplete = (s: AssessmentState) => s.role !== null && s.team !== null && s.svc !== null && firstUnanswered(s) === -1;

/** Deterministic shuffle seeded per session, so a refresh does not reshuffle. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  let t = seed >>> 0;
  const rand = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
