import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import enRecs from "@/locales/en/recommendations.json";
import { fill, withAnswers } from "@/test/fixtures";
import { renderRoute, setBrowser } from "@/test/renderRoute";

describe.each(["en", "zh-TW"] as const)("landing page (%s)", (lang) => {
  beforeEach(() => setBrowser({ lang }));

  it("shows the translated site name and a start button", async () => {
    await renderRoute("/");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(lang === "en" ? "SRE Maturity Self-Assessment" : "SRE 成熟度自評問卷系統");
    expect(screen.getByRole("link", { name: /start|開始/i }).getAttribute("href")).toBe("/start");
  });
});

describe.each(["en", "zh-TW"] as const)("privacy page (%s): standalone from the blog (spec §11.3)", (lang) => {
  beforeEach(() => setBrowser({ lang, url: "/privacy" }));

  it("states that this app is a separate site from the blog and links nowhere", async () => {
    await renderRoute("/privacy");
    const article = screen.getByRole("article");
    expect(article.textContent).toMatch(lang === "en" ? /different website from the author's blog/ : /與作者的部落格是不同的網站/);
    expect(article.querySelectorAll("a")).toHaveLength(0);
    expect(article.innerHTML).not.toMatch(/blogspot|https?:\/\//i);
  });

  it("covers every section the spec requires", async () => {
    await renderRoute("/privacy");
    const headings = within(screen.getByRole("article")).getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(9);
  });
});

describe("outbound links (spec §6.4, §11.3)", () => {
  beforeEach(() => setBrowser({ lang: "en" }));

  it("the footer's blog link is external: new tab, noopener, noreferrer", async () => {
    const { container } = await renderRoute("/");
    const blog = [...container.querySelectorAll("footer a")].find((a) => a.getAttribute("href")?.startsWith("https://"))!;
    expect(blog.getAttribute("target")).toBe("_blank");
    expect(blog.getAttribute("rel")).toMatch(/noopener/);
    expect(blog.getAttribute("rel")).toMatch(/noreferrer/);
  });

  it("the only external link in the footer is the blog; privacy is internal", async () => {
    const { container } = await renderRoute("/");
    const hrefs = [...container.querySelectorAll("footer a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/privacy");
    expect(hrefs.filter((h) => h?.startsWith("http"))).toHaveLength(1);
  });

  it("no page loads scripts, iframes or embeds of its own", async () => {
    for (const path of ["/", "/start", "/privacy"]) {
      const { container, unmount } = await renderRoute(path);
      expect(container.querySelectorAll("script, iframe, embed, object")).toHaveLength(0);
      unmount();
    }
  });
});

describe("share view /r (spec §7.2, §9)", () => {
  const open = async (query: string, lang: "en" | "zh-TW" = "en") => {
    await setBrowser({ lang, url: `/r${query}` });
    return renderRoute(`/r${query}`);
  };
  const valid = (a = "4".repeat(20), role = "m") => `?v=1&lang=en&role=${role}&team=5to15&svc=hybrid&a=${a}`;

  it("shows the overall level, six dimension levels, the radar table and the disclaimer", async () => {
    const { container } = await open(valid());
    expect(container.textContent).toMatch(/L4/);
    expect(container.querySelectorAll("table tbody tr")).toHaveLength(6);
    expect(container.textContent).toMatch(/starting point for self-reflection, not an audit/);
  });

  it("shows no recommendations and no transparency-gap details, but a 'take it myself' button", async () => {
    const { container } = await open(valid("4".repeat(11) + "0" + "4".repeat(8), "e"));
    expect(container.textContent).not.toMatch(/Do now|Next step|Defer|Transparency gaps/i);
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
  });

  it.each([
    ["too short", valid("4".repeat(19))],
    ["a 5 in the code", valid("4".repeat(19) + "5")],
    ["a 0 where this role has no unsure option", valid("0" + "4".repeat(19))],
    ["an unknown version", "?v=9&lang=en&role=m&team=5to15&svc=hybrid&a=" + "4".repeat(20)],
  ])("shows the friendly error page and a retake link for %s", async (_n, q) => {
    const { container } = await open(q);
    expect(container.textContent).toMatch(/can.t be read|無法讀取/i);
    expect(container.querySelector('a[href="/start"]')).not.toBeNull();
    expect(container.querySelectorAll("table")).toHaveLength(0);
  });

  it("never shows a name or email, even if the link carries extra parameters", async () => {
    const { container } = await open(valid() + "&name=Ada&email=ada%40example.com");
    expect(container.textContent).not.toMatch(/Ada|example\.com/);
  });
});

describe("results page uses the saved answers", () => {
  it("redirects to the contact gate when the answers were not submitted yet", async () => {
    await setBrowser({ progress: { role: "manager", team: "5to15", svc: "hybrid", answers: fill(3), submission: "none" }, url: "/results" });
    const { router } = await renderRoute("/results");
    expect(router.state.location.pathname).toBe("/contact");
  });

  it("redirects to the first unanswered question when the questionnaire is incomplete", async () => {
    const answers: (number | null)[] = [...fill(3).slice(0, 7), ...Array(13).fill(null)];
    await setBrowser({ progress: { role: "manager", team: "5to15", svc: "hybrid", answers }, url: "/results" });
    const { router } = await renderRoute("/results");
    expect(router.state.location.pathname).toBe("/q/8");
  });
});

describe("results text joins lists with the language's own separator", () => {
  // d2 (q05–q08) and d5 (q15–q17) both at L1 → both limit the overall level.
  const twoWeakest = () => {
    const chars = "4".repeat(20).split("");
    for (const i of [4, 5, 6, 7, 14, 15, 16]) chars[i] = "1";
    return chars.join("");
  };
  const open = async (lang: "en" | "zh-TW") => {
    const q = `?v=1&lang=${lang}&role=m&team=5to15&svc=hybrid&a=${twoWeakest()}`;
    await setBrowser({ lang, url: `/r${q}` });
    return renderRoute(`/r${q}`);
  };

  it("English: names both limiting dimensions without the CJK '、'", async () => {
    const { container } = await open("en");
    const note = [...container.querySelectorAll("p")].find((p) => /held back|limit/i.test(p.textContent ?? ""));
    expect(note?.textContent).toContain("Incident management & postmortems, Toil & automation");
    expect(note?.textContent).not.toContain("、");
  });

  it("Traditional Chinese: keeps '、'", async () => {
    const { container } = await open("zh-TW");
    expect(container.textContent).toContain("事故管理與事後檢討、Toil 與自動化");
  });
});

describe("results page: deferred item lists its missing prerequisites", () => {
  it("English: joins the two missing capabilities with a comma, not '、'", async () => {
    // N10 is blocked by both N3 (q02 = 1) and N9 (q11 = 1); q10 = 3 keeps N10's own condition unmet.
    const answers = withAnswers(4, { q02: 1, q10: 3, q11: 1 });
    await setBrowser({ progress: { role: "manager", team: "5to15", svc: "hybrid", answers, submission: "submitted" }, url: "/results" });
    const { container } = await renderRoute("/results");
    const deferred = [...container.querySelectorAll("article")].find((a) => /Defer/i.test(a.textContent ?? ""));
    expect(deferred?.textContent).toContain(`${enRecs.N3.name}, ${enRecs.N9.name}`);
    expect(deferred?.textContent).not.toContain("、");
  });
});
