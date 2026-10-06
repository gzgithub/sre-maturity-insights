import { describe, expect, it } from "vitest";
import { fill, validSubmission, withAnswers } from "@/test/fixtures";
import { contactSchema, isHoneypotTriggered, submissionSchema } from "./submissionSchema";

const contact = (o: Record<string, unknown> = {}) => ({
  name: "A",
  email: "a@example.com",
  consentContact: true,
  consentMarketing: false,
  ...o,
});
const issues = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map((i) => i.message) ?? [];

describe("contact gate schema (T12)", () => {
  it("T12: normalises the email (trim + lowercase) and accepts a valid form", () => {
    const parsed = contactSchema.safeParse(contact({ name: "A", email: "A@Example.com " }));
    expect(parsed.success && parsed.data.email).toBe("a@example.com");
  });

  it("T12: invalid email and missing required consent block the submission", () => {
    expect(contactSchema.safeParse(contact({ email: "nope" })).success).toBe(false);
    expect(contactSchema.safeParse(contact({ consentContact: false })).success).toBe(false);
  });

  it.each([
    ["no @", "ada.example.com"],
    ["no domain dot", "ada@example"],
    ["empty", ""],
    ["spaces inside", "a da@example.com"],
    ["longer than 254", `${"a".repeat(250)}@example.com`],
  ])("rejects an email with %s, reporting the 'email' field", (_n, email) => {
    const r = contactSchema.safeParse(contact({ email }));
    expect(r.success).toBe(false);
    expect(issues(r)).toContain("email");
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    ["101 characters", "x".repeat(101)],
  ])("rejects a name that is %s, reporting the 'name' field", (_n, name) => {
    const r = contactSchema.safeParse(contact({ name }));
    expect(r.success).toBe(false);
    expect(issues(r)).toContain("name");
  });

  it("trims the name and allows exactly 1 and 100 characters", () => {
    expect(contactSchema.parse(contact({ name: "  Ada  " })).name).toBe("Ada");
    expect(contactSchema.safeParse(contact({ name: "x" })).success).toBe(true);
    expect(contactSchema.safeParse(contact({ name: "x".repeat(100) })).success).toBe(true);
  });

  it("requires the contact consent to be exactly true, reporting 'consent'", () => {
    const r = contactSchema.safeParse(contact({ consentContact: false }));
    expect(issues(r)).toContain("consent");
    expect(contactSchema.safeParse(contact({ consentContact: undefined })).success).toBe(false);
  });

  it("marketing consent is optional to tick but must be a boolean", () => {
    expect(contactSchema.safeParse(contact({ consentMarketing: true })).success).toBe(true);
    expect(contactSchema.safeParse(contact({ consentMarketing: "yes" })).success).toBe(false);
  });
});

describe("honeypot (T12)", () => {
  it.each([
    ["bot", true],
    ["  x ", true],
    ["", false],
    ["   ", false],
    [undefined, false],
    [null, false],
  ])("isHoneypotTriggered(%j) → %s", (value, expected) => {
    expect(isHoneypotTriggered(value as string | undefined | null)).toBe(expected);
  });
});

describe("submission schema (server-side re-validation)", () => {
  it("accepts a complete payload and normalises name and email", () => {
    const r = submissionSchema.parse(validSubmission());
    expect(r.email).toBe("ada@example.com");
    expect(r.name).toBe("Ada Lovelace");
  });

  it.each<[string, Record<string, unknown>]>([
    ["19 answers", { answers: fill(3).slice(0, 19) }],
    ["21 answers", { answers: [...fill(3), 3] }],
    ["an answer of 5", { answers: withAnswers(3, { q01: 5 }) }],
    ["a negative answer", { answers: withAnswers(3, { q01: -1 }) }],
    ["a fractional answer", { answers: withAnswers(3, { q01: 2.5 }) }],
    ["an unknown role", { role: "admin" }],
    ["an unknown team size", { teamSize: "huge" }],
    ["an unknown service type", { serviceType: "saas" }],
    ["no contact consent", { consentContact: false }],
    ["a missing consent version", { consentVersion: "" }],
    ["a consent version over 32 chars", { consentVersion: "v".repeat(33) }],
    ["a malformed consent time", { consentAt: "yesterday" }],
    ["a missing app version", { appVersion: "" }],
    ["an invalid email", { email: "nope" }],
    ["a one-character locale", { locale: "e" }],
  ])("rejects %s", (_name, override) => {
    expect(submissionSchema.safeParse(validSubmission(override)).success).toBe(false);
  });

  // "unsure" (0) is only valid where the role is offered it.
  it.each([
    { role: "manager", q: "q02", ok: false },
    { role: "engineer", q: "q02", ok: true },
    { role: "engineer", q: "q01", ok: false },
    { role: "manager", q: "q11", ok: true },
  ] as const)("a 0 on $q for $role is accepted: $ok", ({ role, q, ok }) => {
    const answers = withAnswers(3, { [q]: 0 });
    expect(submissionSchema.safeParse(validSubmission({ role, answers })).success).toBe(ok);
  });

  it("ignores client-supplied fields it does not know (e.g. a forged tier or scores)", () => {
    const r = submissionSchema.parse(validSubmission({ tier: "pro", scores: { overallLevel: 4 } }));
    expect(r).not.toHaveProperty("tier");
    expect(r).not.toHaveProperty("scores");
  });

  it("carries the honeypot field through so the server can discard it", () => {
    expect(
      submissionSchema.parse(validSubmission({ website: "http://spam.example" })).website,
    ).toBe("http://spam.example");
  });
});
