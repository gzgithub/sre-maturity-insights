/**
 * Language registry. To add a language:
 * 1. Create src/locales/<code>/{common,questions,recommendations,legal,submission}.json
 * 2. Add (or uncomment) one entry below with enabled: true.
 */
export interface LanguageDef {
  code: string;
  /** Name shown in the language switcher (in its own language). */
  nativeName: string;
  htmlLang: string;
  enabled: boolean;
}

export const LANGUAGES: LanguageDef[] = [
  { code: "zh-TW", nativeName: "繁體中文", htmlLang: "zh-Hant-TW", enabled: true },
  { code: "en", nativeName: "English", htmlLang: "en", enabled: true },
  // { code: "zh-CN", nativeName: "简体中文", htmlLang: "zh-Hans-CN", enabled: true },
  // { code: "ja", nativeName: "日本語", htmlLang: "ja", enabled: true },
];

export const DEFAULT_LANGUAGE = "zh-TW";
export const ENABLED_LANGUAGES = LANGUAGES.filter((l) => l.enabled);
export const ENABLED_CODES = ENABLED_LANGUAGES.map((l) => l.code);

/** Fallback chains: zh-CN → zh-TW → en; ja → en; everything else → en. */
export const FALLBACKS: Record<string, string[]> = {
  "zh-CN": ["zh-TW", "en"],
  ja: ["en"],
  default: ["en"],
};

/** Map an arbitrary tag (e.g. "zh-Hant", "en-US", "zh-HK") to an enabled code, or null. */
export function matchLanguage(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  const exact = ENABLED_CODES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;
  if (lower.startsWith("zh")) {
    const isSimplified = /hans|cn|sg/.test(lower);
    const want = isSimplified ? "zh-CN" : "zh-TW";
    if (ENABLED_CODES.includes(want)) return want;
    if (ENABLED_CODES.includes("zh-TW")) return "zh-TW";
  }
  const base = lower.split("-")[0];
  return ENABLED_CODES.find((c) => c.toLowerCase().split("-")[0] === base) ?? null;
}

export function htmlLangFor(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.htmlLang ?? code;
}
