import { computeScores } from "./scoring";
import { isHoneypotTriggered, type submissionSchema } from "./submissionSchema";
import type { z } from "zod";

export type SubmissionData = z.output<typeof submissionSchema>;

/**
 * Turns a validated submission into the `assessment_submissions` row.
 * Pure, so the server-side rules (honeypot, recomputed scores, tier) can be unit-tested.
 * Returns null when the honeypot is filled: the caller must silently discard the submission.
 */
export function buildSubmissionRow(data: SubmissionData) {
  if (isHoneypotTriggered(data.website)) return null;

  const s = computeScores(data.answers);
  const scores = {
    dimensions: s.dimensions.map((d) => ({
      id: d.id,
      selfReported: Number(d.selfReported.toFixed(3)),
      calibrated: Number(d.calibrated.toFixed(3)),
      level: d.level,
    })),
    overallScore: Number(s.overallScore.toFixed(3)),
    rawLevel: s.rawLevel,
    overallLevel: s.overallLevel,
    capped: s.capped,
    limitingDimensions: s.limitingDimensions,
  };

  return {
    name: data.name,
    email: data.email,
    locale: data.locale,
    role: data.role,
    team_size: data.teamSize,
    service_type: data.serviceType,
    answers: data.answers,
    scores,
    consent_contact: data.consentContact,
    consent_marketing: data.consentMarketing,
    consent_version: data.consentVersion,
    consent_at: data.consentAt,
    tier: "free",
    app_version: data.appVersion,
  };
}
