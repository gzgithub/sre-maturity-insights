import { createInstance } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LANGUAGE,
  ENABLED_CODES,
  FALLBACKS,
  LANGUAGES,
  htmlLangFor,
  matchLanguage,
} from "./languages";
import { LANG_STORAGE_KEY, applyLanguage, detectLanguage } from "./index";

describe("language registry (spec §10.1)", () => {
  it("ships zh-TW (source language, default) and en", () => {
    expect(ENABLED_CODES).toEqual(["zh-TW", "en"]);
    expect(DEFAULT_LANGUAGE).toBe("zh-TW");
  });

  it("every enabled language has a locale folder with all four namespaces", () => {
    const files = Object.keys(import.meta.glob("../locales/*/*.json"));
    for (const { code } of LANGUAGES.filter((l) => l.enabled)) {
      for (const ns of ["common", "questions", "recommendations", "legal"]) {
        expect(files, `${code}/${ns}`).toContain(`../locales/${code}/${ns}.json`);
      }
    }
  });
});

describe("matchLanguage", () => {
  it.each<[string | null | undefined, string | null]>([
    ["zh-TW", "zh-TW"],
    ["en", "en"],
    ["EN", "en"],
    ["en-US", "en"],
    ["en-GB", "en"],
    ["zh-Hant", "zh-TW"],
    ["zh-HK", "zh-TW"],
    ["zh", "zh-TW"],
    ["zh-CN", "zh-TW"], // zh-CN is not enabled yet, so Chinese falls back to Traditional
    ["zh-Hans", "zh-TW"],
    ["ja", null],
    ["fr-FR", null],
    ["", null],
    [null, null],
    [undefined, null],
  ])("%s → %s", (tag, expected) => {
    expect(matchLanguage(tag)).toBe(expected);
  });
});

describe("fallback chains (spec §10.2.5)", () => {
  it("are zh-CN → zh-TW → en, ja → en, everything else → en", () => {
    expect(FALLBACKS["zh-CN"]).toEqual(["zh-TW", "en"]);
    expect(FALLBACKS["ja"]).toEqual(["en"]);
    expect(FALLBACKS["default"]).toEqual(["en"]);
  });

  // Run the real chain config through i18next, with one key present only in some languages.
  it.each([
    { lng: "zh-CN", key: "onlyEn", expected: "EN" },
    { lng: "zh-CN", key: "inTw", expected: "TW" },
    { lng: "zh-CN", key: "inCn", expected: "CN" },
    { lng: "ja", key: "inTw", expected: "EN-for-inTw" },
    { lng: "ja", key: "onlyEn", expected: "EN" },
    { lng: "fr", key: "inTw", expected: "EN-for-inTw" },
  ])("$lng resolves $key to $expected", async ({ lng, key, expected }) => {
    const i18n = createInstance();
    await i18n.init({
      lng,
      fallbackLng: FALLBACKS,
      initAsync: false,
      resources: {
        en: { translation: { onlyEn: "EN", inTw: "EN-for-inTw" } },
        "zh-TW": { translation: { inTw: "TW" } },
        "zh-CN": { translation: { inCn: "CN" } },
      },
    });
    expect(i18n.t(key)).toBe(expected);
  });
});

describe("htmlLangFor", () => {
  it.each([
    ["zh-TW", "zh-Hant-TW"],
    ["en", "en"],
    ["xx", "xx"],
  ])("%s → %s", (code, expected) => {
    expect(htmlLangFor(code)).toBe(expected);
  });
});

describe("language detection order (spec §10.2.4): ?lang → localStorage → browser → zh-TW", () => {
  const browser = (...tags: string[]) =>
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(tags);

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => vi.restoreAllMocks());

  it("uses the URL first", () => {
    window.history.replaceState(null, "", "/?lang=en");
    window.localStorage.setItem(LANG_STORAGE_KEY, "zh-TW");
    browser("zh-TW");
    expect(detectLanguage()).toBe("en");
  });

  it("then the stored choice", () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "en");
    browser("zh-TW");
    expect(detectLanguage()).toBe("en");
  });

  it("then the browser language, skipping unsupported ones", () => {
    browser("fr-FR", "en-GB");
    expect(detectLanguage()).toBe("en");
  });

  it("then zh-TW", () => {
    browser("fr-FR", "ja");
    expect(detectLanguage()).toBe("zh-TW");
  });

  it("ignores an unsupported ?lang= and a corrupt stored value", () => {
    window.history.replaceState(null, "", "/?lang=xx");
    window.localStorage.setItem(LANG_STORAGE_KEY, "garbage");
    browser("en");
    expect(detectLanguage()).toBe("en");
  });
});

describe("applyLanguage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("sets <html lang> and remembers the choice only when asked to persist", () => {
    applyLanguage("en", false);
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();

    applyLanguage("zh-TW", true);
    expect(document.documentElement.lang).toBe("zh-Hant-TW");
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe("zh-TW");
  });

  it("keeps ?lang= in the URL in sync when the user switches language", () => {
    window.history.replaceState(null, "", "/r?v=1&lang=zh-TW&a=44444444444444444444");
    applyLanguage("en", true);
    expect(new URLSearchParams(window.location.search).get("lang")).toBe("en");
    expect(new URLSearchParams(window.location.search).get("a")).toBe("44444444444444444444");
  });
});
