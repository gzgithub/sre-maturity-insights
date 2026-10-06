import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { act, render } from "@testing-library/react";
import i18n, { LANG_STORAGE_KEY } from "@/i18n";
import { routeTree } from "@/routeTree.gen";
import { QUESTIONNAIRE_VERSION, QUESTIONNAIRE_VERSION_KEY } from "@/components/QuestionnaireVersionGuard";
import type { AssessmentState } from "@/lib/assessmentStore";

export const PROGRESS_KEY = "sre-assessment:progress:v1";

/** Put the browser into a known state: language, saved progress, current URL. */
export async function setBrowser({
  lang = "en",
  progress,
  url = "/",
}: { lang?: "en" | "zh-TW"; progress?: Partial<AssessmentState>; url?: string } = {}) {
  window.localStorage.clear();
  window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  window.localStorage.setItem(QUESTIONNAIRE_VERSION_KEY, QUESTIONNAIRE_VERSION);
  if (progress)
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ seed: 1, submission: "none", ...progress }),
    );
  window.history.replaceState(null, "", url);
  await i18n.changeLanguage(lang);
}

/** Render the real route tree at `path` (loaders run first, as in the app). */
export async function renderRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
  await router.load();
  const utils = render(<RouterProvider router={router} />);
  // Let the post-load language detection and store hydration effects run.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  return { router, ...utils };
}
