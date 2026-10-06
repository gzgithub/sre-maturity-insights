# sre-maturity-insights

**SRE 成熟度自評問卷系統 / SRE Maturity Self-Assessment** (v0.1)

A bilingual 20-question self-assessment that measures reliability governance and behavior, not tools.
Two roles (manager/architect, engineer) share one question bank. Results include a two-line radar
(self-reported vs evidence-calibrated), weakest-link cap, transparency gaps and prerequisite-ordered
recommendations.

Repo: [gzgithub/sre-maturity-insights](https://github.com/gzgithub/sre-maturity-insights) (the design doc originally called it `sre-maturity-assessment`).

## Docs

- [`docs/DESIGN.md`](docs/DESIGN.md): the full design spec (Traditional Chinese). Source of truth. Appendix A lists the acceptance test vectors, Appendix B the accepted differences between spec and implementation.
- [`docs/CODE_MAP.md`](docs/CODE_MAP.md): which spec section lives in which file.

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
src/lib/submissionRecord.ts   pure: validated submission -> DB row (honeypot discard, scores recomputed, tier "free")
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

Vitest, jsdom. The suite encodes the spec; Appendix A vectors map to tests as follows (T11, switching language mid-way, is covered by `questionPage.test.tsx` for answers and visible text, but a real-browser pass is still worth doing before launch).

| Vector | File |
|---|---|
| T1–T6 scoring, caps, gap hint, unsure | `src/lib/scoring.test.ts` |
| T7 share URL round trip and strict validation | `src/lib/shareUrl.test.ts`, `src/test/results.test.tsx` |
| T8, T9, T9b, T10 recommendation engine | `src/lib/recommend.test.ts`, `src/test/results.test.tsx` |
| T12 contact gate and honeypot | `src/lib/submissionSchema.test.ts`, `src/lib/submissionRecord.test.ts`, `src/test/contactGate.test.tsx` |

Other conformance tests: question bank and node tables vs spec (`src/data/*.test.ts`), migration has RLS and no policies (`src/data/migrations.test.ts`), i18n (`src/i18n/*.test.ts`: key parity, placeholders, fallback chains, detection order, every `t("key")` resolves), pages (`src/test/*.test.tsx`: privacy is standalone, blog links are external, no PII in storage or URLs).

Shared helpers: `src/test/fixtures.ts` (answer vectors), `src/test/renderRoute.tsx` (render the real route tree in jsdom).
