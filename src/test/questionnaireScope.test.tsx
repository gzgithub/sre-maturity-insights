import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import en from "@/locales/en/common.json";
import zh from "@/locales/zh-TW/common.json";
import { renderRoute, setBrowser } from "@/test/renderRoute";
import { decodeShare } from "@/lib/shareUrl";
import { submissionSchema } from "@/lib/submissionSchema";
import { validSubmission, withAnswers } from "@/test/fixtures";

describe("questionnaire scope and evidence availability", () => {
  it.each([["en", en], ["zh-TW", zh]] as const)("shows scope / observation instructions in %s", async (lang, copy) => {
    await setBrowser({ lang, url: "/start" });
    await renderRoute("/start");
    expect(screen.getByText(copy.start.guidance)).toBeTruthy();
  });

  it("managers can report missing q08 evidence without inventing a completion rate", () => {
    const answers = withAnswers(3, { q08: 0 });
    expect(submissionSchema.safeParse(validSubmission({ answers })).success).toBe(true);
    const query = new URLSearchParams({ v: "1", lang: "en", role: "m", team: "5to15", svc: "hybrid", a: answers.join("") });
    expect(decodeShare(query).ok).toBe(true);
  });
});
