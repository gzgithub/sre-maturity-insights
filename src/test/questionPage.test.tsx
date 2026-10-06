import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import enQuestions from "@/locales/en/questions.json";
import zhQuestions from "@/locales/zh-TW/questions.json";
import commonEn from "@/locales/en/common.json";
import type { QuestionId } from "@/data/questions";
import { LANG_STORAGE_KEY } from "@/i18n";
import { PROGRESS_KEY, renderRoute, setBrowser } from "@/test/renderRoute";

type Q = {
  stem: { manager: string; engineer: string };
  options: Record<string, string>;
  unsure?: string;
};
const en = enQuestions as unknown as Record<QuestionId, Q>;
const zh = zhQuestions as unknown as Record<QuestionId, Q>;

const optionTexts = () =>
  screen.getAllByRole("radio").map((r) => r.textContent!.replace(/^\d/, "").trim());
const profile = (role: "manager" | "engineer", answered = 0) => ({
  role,
  team: "5to15" as const,
  svc: "hybrid" as const,
  answers: Array.from({ length: 20 }, (_, i) => (i < answered ? 3 : null)),
});

describe("question page", () => {
  beforeEach(() => setBrowser({ lang: "en" }));

  it("evidence questions keep their natural order (spec §2: ascending ranges must not be shuffled)", async () => {
    await setBrowser({ progress: profile("manager", 3), url: "/q/4" }); // q04 is evidence
    await renderRoute("/q/4");
    expect(optionTexts()).toEqual([1, 2, 3, 4].map((n) => en.q04.options[String(n)]));
  });

  it("scenario questions show all four options, in a shuffled order that is stable across reloads", async () => {
    await setBrowser({ progress: profile("manager", 0), url: "/q/1" });
    const first = await renderRoute("/q/1");
    const a = optionTexts();
    expect([...a].sort()).toEqual([1, 2, 3, 4].map((n) => en.q01.options[String(n)]).sort());
    first.unmount();
    await renderRoute("/q/1");
    expect(optionTexts()).toEqual(a);
  });

  it("scenario options are shuffled for at least one of several seeds (not always natural order)", async () => {
    const orders = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      await setBrowser({ progress: { ...profile("manager", 0), seed }, url: "/q/1" });
      const r = await renderRoute("/q/1");
      orders.add(optionTexts().join("|"));
      r.unmount();
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("an engineer is offered 'unsure' on q02, always last; a manager is not", async () => {
    await setBrowser({ progress: profile("engineer", 1), url: "/q/2" });
    const eng = await renderRoute("/q/2");
    expect(optionTexts()).toHaveLength(5);
    expect(optionTexts().at(-1)).toBe(en.q02.unsure);
    eng.unmount();

    await setBrowser({ progress: profile("manager", 1), url: "/q/2" });
    await renderRoute("/q/2");
    expect(optionTexts()).toHaveLength(4);
    expect(optionTexts()).not.toContain(en.q02.unsure);
  });

  it("asks the role-specific stem", async () => {
    await setBrowser({ progress: profile("engineer", 0), url: "/q/1" });
    const eng = await renderRoute("/q/1");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.q01.stem.engineer);
    eng.unmount();
    await setBrowser({ progress: profile("manager", 0), url: "/q/1" });
    await renderRoute("/q/1");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.q01.stem.manager);
  });

  it("choosing an option saves the answer (1–4, or 0 for 'unsure')", async () => {
    await setBrowser({ progress: profile("engineer", 1), url: "/q/2" });
    await renderRoute("/q/2");
    const unsure = screen.getAllByRole("radio").at(-1)!;
    await act(async () => {
      fireEvent.click(unsure);
    });
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)!).answers[1]).toBe(0);
  });

  it("number keys choose the matching displayed option", async () => {
    await setBrowser({ progress: profile("manager", 3), url: "/q/4" });
    await renderRoute("/q/4");
    await act(async () => {
      fireEvent.keyDown(window, { key: "3" });
    });
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)!).answers[3]).toBe(3); // evidence: natural order, so key 3 = level 3
  });

  it("won't let you skip ahead of the first unanswered question", async () => {
    await setBrowser({ progress: profile("manager", 2), url: "/q/9" });
    const { router } = await renderRoute("/q/9");
    expect(router.state.location.pathname).toBe("/q/3");
  });

  it("shows progress and a time estimate", async () => {
    await setBrowser({ progress: profile("manager", 4), url: "/q/5" });
    await renderRoute("/q/5");
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(document.body.textContent).toMatch(/Question 5 of 20/);
    expect(document.body.textContent).toMatch(/min left|minute/i);
  });
});

describe("switching language mid-way (T11, automated part)", () => {
  it("keeps every answer and switches all visible question text and <html lang>", async () => {
    await setBrowser({ lang: "en", progress: profile("manager", 5), url: "/q/6" });
    await renderRoute("/q/6");
    const before = window.localStorage.getItem(PROGRESS_KEY);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.q06.stem.manager);
    expect(document.body.textContent).toContain(commonEn.footer.privacy);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: /language/i }), {
        target: { value: "zh-TW" },
      });
    });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(zh.q06.stem.manager);
    expect(optionTexts().sort()).toEqual([1, 2, 3, 4].map((n) => zh.q06.options[String(n)]).sort());
    expect(document.documentElement.lang).toBe("zh-Hant-TW");
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe("zh-TW");
    expect(document.body.textContent).not.toContain(commonEn.footer.privacy);
    expect(window.localStorage.getItem(PROGRESS_KEY)).toBe(before); // answers, role, seed untouched

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.q06.stem.manager);
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem(PROGRESS_KEY)).toBe(before);
  });
});
