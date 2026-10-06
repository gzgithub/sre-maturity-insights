import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import en from "@/locales/en/common.json";
import { QUESTIONNAIRE_VERSION, QUESTIONNAIRE_VERSION_KEY, QuestionnaireVersionGuard } from "./QuestionnaireVersionGuard";
const KEY = "sre-assessment:progress:v1";
beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage("en"); });
describe("questionnaire revision migration", () => {
  it.each([null, "2026-10-v1"])("clears answers from version %s before the assessment mounts", (version) => {
    localStorage.setItem(KEY, '{"answers":[1,2,3]}');
    if (version) localStorage.setItem(QUESTIONNAIRE_VERSION_KEY, version);
    let seen: string | null | undefined;
    function Assessment() { seen = localStorage.getItem(KEY); return <p>assessment</p>; }
    render(<QuestionnaireVersionGuard><Assessment /></QuestionnaireVersionGuard>);
    expect(seen).toBeNull();
    expect(localStorage.getItem(QUESTIONNAIRE_VERSION_KEY)).toBe(QUESTIONNAIRE_VERSION);
    expect(screen.getByRole("status").textContent).toBe(en.questionnaire.updated);
  });
  it("keeps current-version progress on reload", () => {
    localStorage.setItem(QUESTIONNAIRE_VERSION_KEY, QUESTIONNAIRE_VERSION);
    localStorage.setItem(KEY, '{"answers":[1,2,3]}');
    render(<QuestionnaireVersionGuard><p>assessment</p></QuestionnaireVersionGuard>);
    expect(localStorage.getItem(KEY)).toBe('{"answers":[1,2,3]}');
    expect(screen.queryByRole("status")).toBeNull();
  });
});
