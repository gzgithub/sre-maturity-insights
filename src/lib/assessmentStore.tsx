import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { QUESTION_COUNT, type Role, type ServiceType, type TeamSize } from "@/data/questions";

/** Only progress, seed and submission flag are persisted. Never name or email. */
export interface AssessmentState {
  role: Role | null;
  team: TeamSize | null;
  svc: ServiceType | null;
  answers: (number | null)[];
  seed: number;
  submission: "none" | "submitted" | "attempted";
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
});

interface Ctx {
  state: AssessmentState;
  hydrated: boolean;
  setProfile: (p: { role: Role; team: TeamSize; svc: ServiceType }) => void;
  setAnswer: (index: number, value: number) => void;
  setSubmission: (s: AssessmentState["submission"]) => void;
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
        const p = JSON.parse(raw) as AssessmentState;
        if (Array.isArray(p.answers) && p.answers.length === QUESTION_COUNT) setState({ ...empty(), ...p });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setProfile = useCallback<Ctx["setProfile"]>((p) => {
    setState((s) => {
      const roleChanged = s.role !== null && s.role !== p.role;
      // Switching role invalidates "unsure" answers that the other role doesn't offer.
      const answers = roleChanged ? Array(QUESTION_COUNT).fill(null) : s.answers;
      return { ...s, ...p, answers, seed: s.seed || newSeed(), submission: roleChanged ? "none" : s.submission };
    });
  }, []);
  const setAnswer = useCallback((index: number, value: number) => {
    setState((s) => {
      const answers = [...s.answers];
      answers[index] = value;
      return { ...s, answers, submission: "none" };
    });
  }, []);
  const setSubmission = useCallback((submission: AssessmentState["submission"]) => {
    setState((s) => ({ ...s, submission }));
  }, []);
  const reset = useCallback(() => setState({ ...empty(), seed: newSeed() }), []);

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
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
