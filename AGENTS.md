<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Scoring, recommendations and share URLs use only language-neutral IDs (q01, d1, N9, levels); why: logic must not change per language.
- Locale JSON is auto-loaded via import.meta.glob from src/locales/<code>/; why: adding a language = folder + registry line.
- Router uses defaultSsr: false; why: language is detected from browser storage, SSR content would mismatch on hydration.
- Submissions are written only by the submitAssessment server function with the service role; table has RLS and no policies; why: anon must not read or write.
- Never store name/email in localStorage or URLs; why: privacy requirement.
