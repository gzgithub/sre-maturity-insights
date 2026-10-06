import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import enRecs from "@/locales/en/recommendations.json";
import zhCommon from "@/locales/zh-TW/common.json";
import { decodeShare } from "@/lib/shareUrl";
import { fill, withAnswers } from "@/test/fixtures";
import { renderRoute, setBrowser } from "@/test/renderRoute";

const open = async (answers: number[], role: "manager" | "engineer", team: "lt5" | "5to15" | "gt15" = "5to15", lang: "en" | "zh-TW" = "en") => {
  await setBrowser({ lang, progress: { role, team, svc: "hybrid", answers, submission: "submitted" }, url: "/results" });
  return renderRoute("/results");
};
const articles = (c: HTMLElement) => [...c.querySelectorAll("article")];

describe("results page", () => {
  it("T9b end to end: N1 is 'now', N9 is neither now nor next", async () => {
    const { container } = await open(withAnswers(4, { q01: 1, q11: 1 }), "manager");
    const text = articles(container).map((a) => a.textContent);
    const now = text.find((t) => /Do now/i.test(t!))!;
    expect(now).toContain(enRecs.N1.name);
    expect(text.filter((t) => /Do now|Next step/i.test(t!)).join()).not.toContain(enRecs.N9.name);
  });

  it("T9 end to end: stop-the-bleeding puts N9 first", async () => {
    const { container } = await open(withAnswers(4, { q11: 2 }), "engineer");
    expect(articles(container).find((a) => /Do now/i.test(a.textContent!))?.textContent).toContain(enRecs.N9.name);
  });

  it("labels the second recommendation 'Next' and keeps it separate from 'Do now'", async () => {
    // N6 (q05 = 1) and N15 (q13 = 1) tie on trigger score; the lower node number goes first.
    const { container } = await open(withAnswers(4, { q05: 1, q13: 1 }), "manager");
    const bySlot = Object.fromEntries(articles(container).map((a) => [a.querySelector(".eyebrow")?.textContent, a.textContent]));
    expect(bySlot["Do now"]).toContain(enRecs.N6.name);
    expect(bySlot["Next"]).toContain(enRecs.N15.name);
    expect(bySlot["Next"]).not.toContain(enRecs.N6.name);
  });

  it("managers see the governance action, engineers see this-week action and a one-liner for their manager", async () => {
    const answers = withAnswers(4, { q11: 2 });
    const manager = await open(answers, "manager");
    const mText = articles(manager.container).find((a) => /Do now/i.test(a.textContent!))!.textContent!;
    expect(mText).toContain(enRecs.N9.manager);
    expect(mText).not.toContain(enRecs.N9.engineer.pitch);
    manager.unmount();

    const engineer = await open(answers, "engineer");
    const eText = articles(engineer.container).find((a) => /Do now/i.test(a.textContent!))!.textContent!;
    expect(eText).toContain(enRecs.N9.engineer.week);
    expect(eText).toContain(enRecs.N9.engineer.pitch);
    expect(eText).not.toContain(enRecs.N9.manager);
  });

  it("recommendation cards link out to the blog in a new tab", async () => {
    const { container } = await open(withAnswers(4, { q11: 2 }), "manager");
    const links = [...articles(container).find((a) => /Do now/i.test(a.textContent!))!.querySelectorAll("a")];
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a.getAttribute("href")).toMatch(/^https:\/\//);
      expect(a.getAttribute("target")).toBe("_blank");
    }
  });

  it("T10 end to end: a small team is told the PRR step can be skipped", async () => {
    const answers = withAnswers(4, { q18: 3 });
    const small = await open(answers, "manager", "lt5");
    expect(small.container.textContent).toMatch(/Small teams can skip this/i);
    small.unmount();
    const big = await open(answers, "manager", "gt15");
    expect(big.container.textContent).not.toMatch(/Small teams can skip this/i);
  });

  it("lists transparency gaps question by question, only when there are 'unsure' answers", async () => {
    const withGap = await open(withAnswers(4, { q02: 0, q11: 0 }), "engineer");
    expect(withGap.container.textContent).toMatch(/Transparency gaps/i);
    expect(withGap.container.querySelectorAll("section[aria-labelledby=gaps-title] li")).toHaveLength(2);
    withGap.unmount();
    const none = await open(fill(4), "engineer");
    expect(none.container.textContent).not.toMatch(/Transparency gaps/i);
  });

  it("shows the gap hint on a dimension whose description is rosier than its evidence", async () => {
    const { container } = await open(withAnswers(4, { q04: 1 }), "manager");
    expect(container.textContent).toMatch(/more optimistic than your most recent example/i);
  });

  it("all clear: says so instead of recommending anything", async () => {
    const { container } = await open(fill(4), "manager");
    expect(container.textContent).toMatch(/no unmet foundational capabilities/i);
    expect(container.textContent).not.toMatch(/Do now/i);
  });

  it("always shows the disclaimer, the radar's equivalent table and the retake button", async () => {
    const { container } = await open(fill(3), "manager");
    expect(container.textContent).toMatch(/starting point for self-reflection, not an audit/);
    expect(container.querySelectorAll("table tbody tr")).toHaveLength(6);
    expect(screen.getByRole("button", { name: /retake/i })).toBeTruthy();
  });

  it("the zh-TW page shows the zh-TW disclaimer", async () => {
    const { container } = await open(fill(3), "manager", "5to15", "zh-TW");
    expect(container.textContent).toContain(zhCommon.disclaimer);
  });

  it("the share button copies a /r link that decodes back to the same answers and carries no personal data (T7)", async () => {
    const answers = withAnswers(3, { q02: 0, q20: 0 });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } });
    await open(answers, "engineer", "gt15");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy share link/i }));
    });
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const url = new URL(writeText.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/r");
    expect([...url.searchParams.keys()].sort()).toEqual(["a", "lang", "role", "svc", "team", "v"]);
    expect(decodeShare(url.searchParams)).toEqual({ ok: true, data: { lang: "en", role: "engineer", team: "gt15", svc: "hybrid", answers } });
  });
});
