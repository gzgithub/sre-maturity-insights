import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export const QUESTIONNAIRE_VERSION = "2026-10-v2";
export const QUESTIONNAIRE_VERSION_KEY = "sre-assessment:questionnaire-version";
const PROGRESS_KEY = "sre-assessment:progress:v1";

/** Mount the assessment only after old, differently worded answers are invalidated. */
export function QuestionnaireVersionGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(QUESTIONNAIRE_VERSION_KEY) !== QUESTIONNAIRE_VERSION) {
        const hadProgress = localStorage.getItem(PROGRESS_KEY) !== null;
        localStorage.removeItem(PROGRESS_KEY);
        localStorage.setItem(QUESTIONNAIRE_VERSION_KEY, QUESTIONNAIRE_VERSION);
        setUpdated(hadProgress);
      }
    } catch { /* Unavailable storage falls back to the assessment's in-memory state. */ }
    setReady(true);
  }, []);
  if (!ready) return null;
  return (
    <>
      {updated && <p role="status" className="mx-auto max-w-3xl px-4 pt-4 text-sm">{t("questionnaire.updated")}</p>}
      {children}
    </>
  );
}
