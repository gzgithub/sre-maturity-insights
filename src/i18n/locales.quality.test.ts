import { describe, expect, it } from "vitest";

const modules = import.meta.glob("../locales/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Record<string, unknown>>;

function flatten(obj: unknown, prefix = ""): [string, unknown][] {
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [[prefix, obj]];
}

const byLocale: Record<string, Record<string, Map<string, unknown>>> = {};
for (const [path, data] of Object.entries(modules)) {
  const m = path.match(/locales\/([^/]+)\/([^/]+)\.json$/)!;
  (byLocale[m[1]!] ??= {})[m[2]!] = new Map(flatten(data));
}

const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]!).sort();
const tags = (s: string) => [...s.matchAll(/<\/?(\d+)>/g)].map((m) => m[1]!).sort();

const source = byLocale["zh-TW"]!;
const others = Object.keys(byLocale).filter((c) => c !== "zh-TW");
const cases = others.flatMap((code) => Object.keys(source).map((ns) => ({ code, ns })));

describe("locale content quality (beyond key parity)", () => {
  it.each(cases)("$code/$ns: every value is a non-empty string", ({ code, ns }) => {
    for (const [key, value] of byLocale[code]![ns]!) {
      expect(typeof value, key).toBe("string");
      expect((value as string).trim(), key).not.toBe("");
    }
  });

  it.each(cases)(
    "$code/$ns: uses the same {{placeholders}} and <n> tags as zh-TW in every string",
    ({ code, ns }) => {
      for (const [key, zh] of source[ns]!) {
        const other = byLocale[code]![ns]!.get(key) as string;
        expect(placeholders(other), `${key} placeholders`).toEqual(placeholders(zh as string));
        expect(tags(other), `${key} tags`).toEqual(tags(zh as string));
      }
    },
  );

  it.each(Object.keys(source))("zh-TW/%s: every value is a non-empty string", (ns) => {
    for (const [key, value] of source[ns]!) {
      expect(typeof value, key).toBe("string");
      expect((value as string).trim(), key).not.toBe("");
    }
  });
});
