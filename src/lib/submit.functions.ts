import { createServerFn } from "@tanstack/react-start";
import { submissionSchema } from "./submissionSchema";
import { buildSubmissionRow } from "./submissionRecord";

/**
 * "submit-assessment": re-validates with zod and inserts with the service role.
 * The table has RLS enabled and no anon/authenticated policies, so this is the only write path.
 */
export const submitAssessment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submissionSchema.parse(data))
  .handler(async ({ data }) => {
    // Honeypot filled: silently accept and discard.
    const row = buildSubmissionRow(data);
    if (!row) return { ok: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("assessment_submissions").insert(row);
    if (error) {
      console.error("submit-assessment insert failed:", error.message);
      throw new Error("insert_failed");
    }
    return { ok: true as const };
  });
