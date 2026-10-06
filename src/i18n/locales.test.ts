import { describe, expect, it } from "vitest";

const modules = import.meta.glob("../locales/*/*.json", { eager: true, import: "default" }) as Record<
  string,
  Record<string, unknown>
>;

function flatten(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

const byLocale: Record<string, Record<string, string[]>> = {};
for (const [path, data] of Object.entries(modules)) {
  const [, code, ns] = path.match(/locales\/([^/]+)\/([^/]+)\.json$/)!;
  (byLocale[code] ??= {})[ns] = flatten(data).sort();
}

describe("locale key parity", () => {
  const source = byLocale["zh-TW"];
  for (const code of Object.keys(byLocale).filter((c) => c !== "zh-TW")) {
    it(`${code} has exactly the same keys as zh-TW`, () => {
      expect(Object.keys(byLocale[code]).sort()).toEqual(Object.keys(source).sort());
      for (const ns of Object.keys(source)) expect(byLocale[code][ns]).toEqual(source[ns]);
    });
  }
});
