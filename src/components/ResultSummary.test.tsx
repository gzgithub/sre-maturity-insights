import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeScores } from "@/lib/scoring";
import { fill } from "@/test/fixtures";
import { ResultSummary } from "./ResultSummary";

const state = vi.hoisted(() => ({ locale: "en", axis: {} as Record<string, unknown> }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: state.locale },
    t: (key: string, values?: Record<string, unknown>) => values?.["score"] ? String(values["score"]) : key,
  }),
}));
vi.mock("recharts", async () => {
  const { createElement } = await import("react");
  const container = ({ children }: { children?: import("react").ReactNode }) => createElement("div", {}, children);
  return {
    ResponsiveContainer: container, RadarChart: container,
    PolarGrid: () => null, PolarAngleAxis: () => null, Radar: () => null, Legend: () => null,
    PolarRadiusAxis: (props: Record<string, unknown>) => { state.axis = props; return null; },
  };
});
describe("score presentation contract", () => {
  it.each(["en", "zh-TW", "de-DE"])("formats summary and table with Intl for %s", (locale) => {
    state.locale = locale;
    const scores = computeScores(fill(3));
    const { container } = render(<ResultSummary scores={scores} />);
    const expected = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(3);
    expect(screen.getAllByText(expected).length).toBe(13);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(6);
    expect(state.axis["domain"]).toEqual([1, 4]);
    expect(state.axis["ticks"]).toEqual([1, 2, 3, 4]);
  });
});
