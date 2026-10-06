# sre-maturity-assessment

**SRE 成熟度自評問卷系統 / SRE Maturity Self-Assessment** (v0.1)

A bilingual 20-question self-assessment that measures reliability governance and behavior, not tools.
Two roles (manager/architect, engineer) share one question bank. Results include a two-line radar
(self-reported vs evidence-calibrated), weakest-link cap, transparency gaps and prerequisite-ordered
recommendations. Full design: [`docs/DESIGN.md`](docs/DESIGN.md).

## Before launch

Edit `src/config/site.ts`:

| Constant | Placeholder | Notes |
|---|---|---|
| `operatorName` | `TODO_OPERATOR_NAME` | Data controller for this app. Not the blog's brand. |
| `contactEmail` | `privacy@example.com` | Dedicated privacy / deletion contact for this app. |
| `retentionPeriod` | `TODO_RETENTION_PERIOD` | Shown on `/privacy`. |
| `consentVersion` | `2026-10-v1` | Bump whenever consent wording changes. |

Also: have the consent wording and privacy policy reviewed, and pair blog articles in `src/data/nodeArticles.ts`.

## Structure

```
src/config/site.ts            site constants (operator, contact, blog URL, consent version)
src/i18n/languages.ts         language registry + fallback chains
src/i18n/index.ts             i18next init, detection (?lang → localStorage → browser → zh-TW)
src/locales/<code>/           common / questions / recommendations / legal JSON
src/data/                     language-neutral data: questions, dimensions, nodes, nodeArticles
src/lib/scoring.ts            pure scoring (weights, levels, cap, gap, transparency gaps)
src/lib/recommend.ts          pure recommendation engine (N1–N17)
src/lib/shareUrl.ts           share URL encode / decode
src/lib/submissionSchema.ts   zod schemas shared by browser and server
src/lib/submit.functions.ts   server function "submit-assessment" (service-role insert)
src/routes/                   /, /start, /q/$n, /contact, /results, /r, /privacy
```

Submissions go to the `assessment_submissions` table. RLS is enabled with no policies, so browsers
cannot read or write it; only the server function inserts. View/export rows in the Cloud database view.

## Adding a language

1. Copy `src/locales/en/` to `src/locales/<code>/` and translate every value (keep keys).
2. Add (or uncomment) one entry in `src/i18n/languages.ts` with `enabled: true`.

That's it — resources load automatically. `src/i18n/locales.test.ts` fails if any locale's keys differ from zh-TW.

## Tests

```
bun run test
```

Covers Appendix A vectors T1–T10 and T12 (`src/lib/assessment.test.ts`) and locale key parity.
