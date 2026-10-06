import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, ENABLED_CODES, FALLBACKS, htmlLangFor, matchLanguage } from "./languages";

export const NAMESPACES = ["common", "questions", "recommendations", "legal", "submission"] as const;
export const LANG_STORAGE_KEY = "sre-assessment:lang";

// Every src/locales/<code>/<namespace>.json is picked up automatically.
const modules = import.meta.glob("../locales/*/*.json", { eager: true, import: "default" }) as Record<
  string,
  Record<string, unknown>
>;
const resources: Resource = {};
for (const [path, data] of Object.entries(modules)) {
  const m = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!m) continue;
  const code = m[1]!;
  const ns = m[2]!;
  if (!ENABLED_CODES.includes(code)) continue;
  resources[code] = { ...(resources[code] ?? {}), [ns]: data };
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: FALLBACKS,
    supportedLngs: ENABLED_CODES,
    ns: [...NAMESPACES],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    initAsync: false,
    returnNull: false,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key ${ns}:${key} for ${lngs.join(",")}`);
    },
  });
}

/** Detection order: URL ?lang= → localStorage → browser language → default. Client only. */
export function detectLanguage(): string {
  const fromUrl = matchLanguage(new URLSearchParams(window.location.search).get("lang"));
  if (fromUrl) return fromUrl;
  const stored = matchLanguage(window.localStorage.getItem(LANG_STORAGE_KEY));
  if (stored) return stored;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const m = matchLanguage(tag);
    if (m) return m;
  }
  return DEFAULT_LANGUAGE;
}

export function applyLanguage(code: string, persist: boolean) {
  void i18n.changeLanguage(code);
  document.documentElement.lang = htmlLangFor(code);
  if (persist) {
    window.localStorage.setItem(LANG_STORAGE_KEY, code);
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", code);
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }
}

export default i18n;
