import { DEFAULT_LANGUAGE, htmlLangFor, matchLanguage } from "@/i18n/languages";

const modules = import.meta.glob("../locales/*/common.json", { eager: true, import: "default" }) as Record<
  string, { error: { title: string; body: string; retry: string; home: string } }
>;
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]!));

/** Server fallback cannot read browser storage; URL, Accept-Language, then zh-TW. */
function requestLanguage(request?: Request): string {
  if (!request) return DEFAULT_LANGUAGE;
  const query = matchLanguage(new URL(request.url).searchParams.get("lang"));
  if (query) return query;
  const preferences = (request.headers.get("accept-language") ?? "").split(",").map((entry) => {
    const [tag, ...parameters] = entry.trim().split(";");
    const q = parameters.find((p) => p.trim().startsWith("q="));
    return { tag, quality: q ? Number(q.trim().slice(2)) : 1 };
  }).filter((p) => Number.isFinite(p.quality) && p.quality > 0 && p.quality <= 1)
    .sort((a, b) => b.quality - a.quality);
  for (const preference of preferences) {
    const code = matchLanguage(preference.tag);
    if (code) return code;
  }
  return DEFAULT_LANGUAGE;
}
export function renderErrorPage(request?: Request): string {
  const code = requestLanguage(request);
  const source = modules[`../locales/${code}/common.json`] ?? modules["../locales/en/common.json"]!;
  const copy = source.error;
  return `<!doctype html>
<html lang="${escape(htmlLangFor(code))}">
  <head>
    <meta charset="utf-8" />
    <title>${escape(copy.title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escape(copy.title)}</h1>
      <p>${escape(copy.body)}</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">${escape(copy.retry)}</button>
        <a class="secondary" href="/?lang=${encodeURIComponent(code)}">${escape(copy.home)}</a>
      </div>
    </div>
  </body>
</html>`;
}
