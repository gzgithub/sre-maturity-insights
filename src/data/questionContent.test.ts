import { describe, expect, it } from "vitest";
import en from "@/locales/en/questions.json";
import zh from "@/locales/zh-TW/questions.json";

describe.each([["en", en], ["zh-TW", zh]] as const)("evidence option contract in %s", (lang, bank) => {
  it("covers a recent decision whose supporting data cannot be identified", () => {
    expect(bank.q04.options["3"]).toContain(lang === "en" ? "both the decision and its supporting data" : "具體決策與支持數據");
    expect(bank.q04.options["2"]).toContain(lang === "en" ? "six months" : "六個月");
  });
  it("distinguishes no recorded action items from recorded items not due yet", () => {
    expect(bank.q08.options["1"]).toContain(lang === "en" ? "No action items were recorded" : "未記錄改善項目");
    expect(bank.q08.unsure).toContain(lang === "en" ? "Action items exist but none are due" : "有改善項目但尚無已到期項目");
    expect(bank.q08.options["3"]).toContain(lang === "en" ? "effectiveness has not been verified" : "尚未驗證");
  });
  it.each([
    { q: "q11" as const, boundary: "50", lower: "2" as const, higher: "3" as const },
    { q: "q11" as const, boundary: "80", lower: "3" as const, higher: "4" as const },
    { q: "q14" as const, boundary: "15", lower: "4" as const, higher: "3" as const },
    { q: "q14" as const, boundary: "60", lower: "3" as const, higher: "2" as const },
  ])("$q assigns $boundary exclusively to the inclusive interval", ({ q, boundary, lower, higher }) => {
    expect(bank[q].options[lower]).toContain(lang === "en" ? "below " + boundary : "低於 " + boundary);
    expect(bank[q].options[higher]).toContain(lang === "en" ? "At least " + boundary : "至少 " + boundary);
  });
});
