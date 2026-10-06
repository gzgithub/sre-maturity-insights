import { beforeEach, describe, expect, it, vi } from "vitest";
import { validSubmission } from "@/test/fixtures";
import { submitAssessment } from "./submit.functions";

const db = vi.hoisted(() => ({
  from: vi.fn(), insert: vi.fn(), upsert: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: (parse: (value: unknown) => unknown) => ({
      handler: (fn: (input: { data: unknown }) => unknown) =>
        (input: { data: unknown }) => fn({ data: parse(input.data) }),
    }),
  }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db);
  db.insert.mockResolvedValue({ error: null });
  db.upsert.mockResolvedValue({ error: null });
});
describe("idempotent server submission", () => {
  it("retries insert once per id and preserves the original contact and consent", async () => {
    const data = validSubmission();
    await submitAssessment({ data });
    await submitAssessment({ data });
    expect(db.upsert).toHaveBeenCalledTimes(2);
    for (const [row, options] of db.upsert.mock.calls) {
      expect(row).toMatchObject({ id: data.submissionId, consent_at: data.consentAt });
      expect(options).toEqual({ onConflict: "id", ignoreDuplicates: true });
    }
    expect(db.insert).not.toHaveBeenCalled();
  });
});
