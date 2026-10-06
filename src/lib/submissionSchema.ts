import { z } from "zod";
import { QUESTIONS } from "@/data/questions";

/** Contact gate fields. Error messages are i18n keys resolved in the UI. */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "name").max(100, "name"),
  email: z.string().trim().toLowerCase().max(254, "email").pipe(z.email("email")),
  consentContact: z.literal(true, "consent"),
  consentMarketing: z.boolean(),
});
export type ContactInput = z.input<typeof contactSchema>;

export const submissionSchema = contactSchema
  .extend({
    locale: z.string().min(2).max(16),
    role: z.enum(["manager", "engineer"]),
    teamSize: z.enum(["lt5", "5to15", "gt15"]),
    serviceType: z.enum(["internal", "external", "hybrid"]),
    answers: z.array(z.number().int().min(0).max(4)).length(QUESTIONS.length),
    consentVersion: z.string().min(1).max(32),
    consentAt: z.iso.datetime(),
    appVersion: z.string().min(1).max(32),
    /** Honeypot: must be empty. */
    website: z.string().max(500).optional(),
  })
  .refine((d) => d.answers.every((v, i) => v !== 0 || QUESTIONS[i]!.unsure[d.role]), {
    message: "answers",
    path: ["answers"],
  });
export type SubmissionInput = z.input<typeof submissionSchema>;

export function isHoneypotTriggered(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
