import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { submissionSchema } from "@/lib/submissionSchema";
import { buildSubmissionRow } from "@/lib/submissionRecord";
import { validSubmission } from "@/test/fixtures";

const dir = join(process.cwd(), "supabase", "migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(dir, f), "utf8"))
  .join("\n");

const table = /CREATE TABLE public\.assessment_submissions \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
const columns = table
  .split("\n")
  .map((l) => /^\s*(\w+)\s+(uuid|text|timestamptz|jsonb|boolean)\b(.*)$/.exec(l))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ name: m[1]!, required: /NOT NULL/.test(m[3]!) && !/DEFAULT/.test(m[3]!) && !/PRIMARY KEY/.test(m[3]!) }));

describe("assessment_submissions migration (spec §11.1, §11.2)", () => {
  it("defines the table with the spec'd columns", () => {
    expect(columns.map((c) => c.name)).toEqual([
      "id", "created_at", "name", "email", "locale", "role", "team_size", "service_type", "answers", "scores",
      "consent_contact", "consent_marketing", "consent_version", "consent_at", "tier", "app_version",
    ]);
  });

  it("defaults tier to 'free' and consent_marketing to false", () => {
    expect(table).toMatch(/tier text NOT NULL DEFAULT 'free'/);
    expect(table).toMatch(/consent_marketing boolean NOT NULL DEFAULT false/);
  });

  it("enforces the required consent and lower-case email in the database too", () => {
    expect(table).toMatch(/consent_contact boolean NOT NULL CHECK \(consent_contact = true\)/);
    expect(table).toMatch(/email = lower\(email\)/);
  });

  it("enables row level security", () => {
    expect(sql).toMatch(/ALTER TABLE public\.assessment_submissions ENABLE ROW LEVEL SECURITY/);
  });

  it("creates no policy and grants nothing to anon or authenticated, so browsers cannot read or write it", () => {
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/GRANT[^;]*\bTO\b[^;]*\b(anon|authenticated|public)\b/i);
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });

  it("the grant check really sees a grant to anon (guards the regex above)", () => {
    expect("GRANT SELECT ON public.t TO anon;").toMatch(/GRANT[^;]*\bTO\b[^;]*\b(anon|authenticated|public)\b/i);
    expect("GRANT ALL ON public.t TO service_role;").not.toMatch(/GRANT[^;]*\bTO\b[^;]*\b(anon|authenticated|public)\b/i);
  });

  it("only the server (service role) is granted access", () => {
    expect(sql).toMatch(/GRANT ALL ON public\.assessment_submissions TO service_role/);
  });

  it("the row the server function inserts fills every required column and no unknown column", () => {
    const row = buildSubmissionRow(submissionSchema.parse(validSubmission()))!;
    const names = columns.map((c) => c.name);
    for (const key of Object.keys(row)) expect(names, `unknown column ${key}`).toContain(key);
    for (const c of columns.filter((c) => c.required)) expect(row, `missing ${c.name}`).toHaveProperty(c.name);
  });
});
