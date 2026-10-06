import { createServerFn } from "@tanstack/react-start";
import { isHoneypotTriggered, submissionSchema } from "./submissionSchema";
import { computeScores } from "./scoring";

/**
 * "submit-assessment": re-validates with zod and inserts with the service role.
 * The table has RLS enabled and no anon/authenticated policies, so this is the only write path.
 */
export const submitAssessment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submissionSchema.parse(data))
  .handler(async ({ data }) => {
    // Honeypot filled: silently accept and discard.
    if (isHoneypotTriggered(data.website)) return { ok: true as const };

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("assessment_submissions").insert({
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
    });
    if (error) {
      console.error("submit-assessment insert failed:", error.message);
      throw new Error("insert_failed");
    }
    return { ok: true as const };
  });
