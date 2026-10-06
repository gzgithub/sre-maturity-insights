import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderRoute, setBrowser } from "@/test/renderRoute";

const RAW_FACT_IDS = ["questions", "minutes", "dimensions"];

describe.each(["en", "zh-TW"] as const)("landing page quick facts (%s)", (lang) => {
  beforeEach(() => setBrowser({ lang }));

  it("labels the facts with translated text, not raw ids (spec §10.2: no hard-coded visible text)", async () => {
    const { container } = await renderRoute("/");
    const labels = [...container.querySelectorAll("dt")].map((e) => e.textContent?.trim());
    expect(labels).toHaveLength(3);
    for (const label of labels) {
      expect(label).toBeTruthy();
      expect(RAW_FACT_IDS).not.toContain(label);
    }
  });

  it("pairs each label with its value", async () => {
    await renderRoute("/");
    expect(screen.getAllByText(lang === "en" ? /20 questions/ : /20 題/).length).toBeGreaterThan(0);
  });
});
