import { describe, expect, it } from "vitest";
import en from "@/locales/en/common.json";
import zh from "@/locales/zh-TW/common.json";
import { renderErrorPage } from "./error-page";

describe("catastrophic server fallback language", () => {
  it.each([
    { query: "", header: "", lang: "zh-Hant-TW", copy: zh.error },
    { query: "?lang=en", header: "zh-TW", lang: "en", copy: en.error },
    { query: "", header: "en-US", lang: "en", copy: en.error },
    { query: "?lang=unknown", header: "en;q=0.2,zh-TW;q=0.9", lang: "zh-Hant-TW", copy: zh.error },
    { query: "", header: "en;q=0,zh-TW;q=1", lang: "zh-Hant-TW", copy: zh.error },
  ])("uses $lang for query $query and header $header", ({ query, header, lang, copy }) => {
    const html = renderErrorPage(new Request("https://example.test/" + query, { headers: { "accept-language": header } }));
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.documentElement.lang).toBe(lang);
    expect(document.title).toBe(copy.title);
    expect(document.querySelector("h1")?.textContent).toBe(copy.title);
    expect(document.querySelector("p")?.textContent).toBe(copy.body);
    expect(document.querySelector("button")?.textContent).toBe(copy.retry);
    expect(document.querySelector("a")?.textContent).toBe(copy.home);
  });
});
