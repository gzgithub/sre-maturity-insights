import { describe, expect, it } from "vitest";
import { fill, validSubmission, withAnswers, withDimensions } from "@/test/fixtures";
import { computeScores } from "./scoring";
import { buildSubmissionRow } from "./submissionRecord";
import { submissionSchema } from "./submissionSchema";

/** What the server function sees: the payload after zod validation. */
const row = (overrides: Record<string, unknown> = {}) =>
  buildSubmissionRow(submissionSchema.parse(validSubmission(overrides)));

describe("submission row (server side of the contact gate)", () => {
  it("T12: a filled honeypot yields no row, so nothing is written", () => {
    expect(row({ website: "http://spam.example" })).toBeNull();
    expect(row({ website: "  x " })).toBeNull();
  });

  it("an empty or whitespace-only honeypot is not a bot", () => {
    expect(row({ website: "" })).not.toBeNull();
    expect(row({ website: "   " })).not.toBeNull();
    expect(row({})).not.toBeNull();
  });

  it("stores the lower-cased, trimmed contact data and the consent fields", () => {
    expect(row({ consentMarketing: true })).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      consent_contact: true,
      consent_marketing: true,
      consent_version: "2026-10-v1",
      consent_at: "2026-10-07T00:00:00.000Z",
      app_version: "0.1.0",
    });
  });

  it("stores the profile and the 20 raw answers", () => {
    const answers = withAnswers(3, { q02: 0, q11: 0 });
    expect(
      row({ role: "engineer", locale: "zh-TW", teamSize: "lt5", serviceType: "external", answers }),
    ).toMatchObject({
      locale: "zh-TW",
      role: "engineer",
      team_size: "lt5",
      service_type: "external",
      answers,
    });
  });

  it("always sets tier to 'free', whatever the client sends", () => {
    expect(row()?.tier).toBe("free");
    expect(row({ tier: "pro" })?.tier).toBe("free");
  });

  it("recomputes the scores from the answers and ignores any client-supplied scores", () => {
    const forged = row({ answers: fill(1), scores: { overallLevel: 4, capped: false } });
    expect(forged?.scores.overallLevel).toBe(1);
    expect(forged?.scores.overallScore).toBe(1);
  });

  it("stores per-dimension self/calibrated scores, the overall level and the weakest-link cap", () => {
    const answers = withDimensions(4, { d6: 1 }); // T4
    const expected = computeScores(answers);
    const scores = row({ answers })!.scores;
    expect(scores.overallLevel).toBe(2);
    expect(scores.rawLevel).toBe(4);
    expect(scores.capped).toBe(true);
    expect(scores.limitingDimensions).toEqual(["d6"]);
    expect(scores.dimensions).toHaveLength(6);
    scores.dimensions.forEach((d, i) => {
      expect(d.id).toBe(expected.dimensions[i]!.id);
      expect(d.selfReported).toBeCloseTo(expected.dimensions[i]!.selfReported, 3);
      expect(d.calibrated).toBeCloseTo(expected.dimensions[i]!.calibrated, 3);
      expect(d.level).toBe(expected.dimensions[i]!.level);
    });
  });
});

it("uses the stable submission id as the database primary key", () => {
  expect(row()).toMatchObject({ id: validSubmission().submissionId });
});
