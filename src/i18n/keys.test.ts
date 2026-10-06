import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const modules = import.meta.glob("../locales/zh-TW/*.json", { eager: true, import: "default" }) as Record<string, Record<string, unknown>>;
const resolve = (obj: unknown, path: string) => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);

const byNs: Record<string, unknown> = {};
for (const [p, data] of Object.entries(modules)) byNs[p.match(/\/([^/]+)\.json$/)![1]!] = data;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "ui" || f === "locales" ? [] : sourceFiles(p);
    return /\.tsx?$/.test(f) && !/\.test\.|routeTree|integrations/.test(f) ? [p] : [];
  });
}

describe("every literal t('key') in the source resolves in zh-TW (no missing or misspelt keys)", () => {
  const found: { file: string; key: string }[] = [];
  for (const file of sourceFiles(join(process.cwd(), "src"))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/\bt\(\s*"([A-Za-z][\w.:]*)"/g)) found.push({ file: file.replace(process.cwd() + "/", ""), key: m[1]! });
  }

  it("finds a meaningful number of keys (guards the scanner itself)", () => {
    expect(found.length).toBeGreaterThan(60);
  });

  it.each([...new Map(found.map((f) => [f.key, f])).values()])("$key ($file)", ({ key }) => {
    const [ns, path] = key.includes(":") ? key.split(":") : [undefined, key];
    const candidates = ns ? [byNs[ns]] : Object.values(byNs);
    expect(candidates.some((c) => typeof resolve(c, path!) === "string"), `no string for ${key}`).toBe(true);
  });
});
