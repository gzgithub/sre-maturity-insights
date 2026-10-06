# Code map: where the design spec lives in code

The full design spec is [`DESIGN.md`](DESIGN.md) (source of truth, Traditional Chinese).
This file only points from spec sections to the code that implements them.
Known differences between spec and implementation are listed in DESIGN.md Appendix B.

| Spec | Code |
|---|---|
| Questions (§5) | `src/data/questions.ts` + `src/locales/*/questions.json` |
| Capability nodes and wording (§6) | `src/data/nodes.ts` + `src/locales/*/recommendations.json` |
| Scoring and level thresholds (§4) | `src/lib/scoring.ts` |
| Recommendation rules (§6.2) | `src/lib/recommend.ts` |
| Share URL (§9) | `src/lib/shareUrl.ts` |
| Contact gate and submit rules (§8) | `src/lib/submissionSchema.ts`, `src/lib/submissionRecord.ts`, `src/lib/submit.functions.ts`, `src/routes/contact.tsx` |
| Data model (§11.1) | `assessment_submissions` table (`supabase/migrations/`) |
| i18n (§10) | `src/i18n/`, `src/locales/` |
| Privacy (§11.3) | `src/locales/*/legal.json`, page `/privacy` |
| Acceptance vectors (Appendix A) | `src/lib/*.test.ts`, `src/test/*.test.tsx` (see README "Tests"; T11 also needs a manual browser pass) |

## Open items (spec §14)

Operator name and contact email, retention period, article pairing for nodes, consent wording review,
zh-CN / ja translation review.
