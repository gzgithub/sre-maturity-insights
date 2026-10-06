import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSubmission } from "@/lib/submitClient";
import { site } from "@/config/site";
import { fill, withAnswers } from "@/test/fixtures";
import { PROGRESS_KEY, renderRoute, setBrowser } from "@/test/renderRoute";

const submit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/submit.functions", () => ({ submitAssessment: submit }));

const ANSWERS = withAnswers(3, { q02: 0, q11: 2 });
const open = async () => {
  await setBrowser({
    progress: {
      role: "engineer",
      team: "5to15",
      svc: "hybrid",
      answers: ANSWERS,
      submission: "none",
    },
    url: "/contact",
  });
  return renderRoute("/contact");
};
const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const tick = (consent: RegExp) => fireEvent.click(screen.getByRole("checkbox", { name: consent }));
const send = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /see my results|查看結果/i }));
  });
};
const fillValid = () => {
  type(/^name$/i, "  Ada Lovelace ");
  type(/^email$/i, " Ada@Example.COM ");
  tick(/I agree that/i);
};

beforeEach(() => {
  cancelSubmission();
  submit.mockReset().mockResolvedValue({ ok: true });
});

afterEach(() => cancelSubmission());

describe("contact gate (T12, spec §8)", () => {
  it.each([
    { name: "invalid email", contactName: "Ada", email: "not-an-email", consent: true, error: /valid email/i },
    { name: "missing name", contactName: "", email: "ada@example.com", consent: true, error: /name/i },
    { name: "missing consent", contactName: "Ada", email: "ada@example.com", consent: false, error: /consent|tick/i },
  ])("blocks $name and reports the field error", async (test) => {
    await open();
    type(/^name$/i, test.contactName);
    type(/^email$/i, test.email);
    if (test.consent) tick(/I agree that/i);
    await send();
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(test.error);
  });

  it("the marketing consent is optional and unticked by default", async () => {
    await open();
    expect(
      screen.getByRole("checkbox", { name: /SRE \/ DevOps/i }).getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      screen.getByRole("checkbox", { name: /I agree that/i }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("silently discards a filled honeypot: nothing is sent, the user still lands on the results", async () => {
    const { router } = await open();
    fillValid();
    fireEvent.change(document.getElementById("website")!, {
      target: { value: "http://spam.example" },
    });
    await send();
    expect(submit).not.toHaveBeenCalled();
    await waitFor(() => expect(router.state.location.pathname).toBe("/results"));
  });

  it("sends a clean payload: trimmed, lower-cased email, consent fields and version, raw answers", async () => {
    const { router } = await open();
    fillValid();
    await send();
    expect(submit).toHaveBeenCalledTimes(1);
    const payload = submit.mock.calls[0]![0].data;
    expect(payload).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      consentContact: true,
      consentMarketing: false,
      consentVersion: site.consentVersion,
      appVersion: site.appVersion,
      role: "engineer",
      teamSize: "5to15",
      serviceType: "hybrid",
      answers: ANSWERS,
      locale: "en",
    });
    expect(payload).not.toHaveProperty("website");
    expect(new Date(payload.consentAt).toString()).not.toBe("Invalid Date");
    await waitFor(() => expect(router.state.location.pathname).toBe("/results"));
  });

  it("never puts the name or email in localStorage or in the URL (spec §11.4, §9)", async () => {
    const { router } = await open();
    fillValid();
    await send();
    await waitFor(() => expect(router.state.location.pathname).toBe("/results"));

    const stored = Object.keys(window.localStorage)
      .map((k) => `${k}=${window.localStorage.getItem(k)}`)
      .join("\n");
    expect(stored).not.toMatch(/ada|lovelace|example\.com/i);
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)!).submission).toBe("submitted");
    expect(Object.keys(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)!)).sort()).toEqual([
      "answers",
      "role",
      "seed",
      "submission",
      "submissionId",
      "svc",
      "team",
    ]);
    expect(router.state.location.href).not.toMatch(/ada|lovelace|example/i);
    expect(window.location.href).not.toMatch(/ada|lovelace|example/i);
  });

  it("a failed save does not block the results; the user is told it will be retried (spec §8.3.4)", async () => {
    submit.mockRejectedValue(new Error("down"));
    const { router } = await open();
    fillValid();
    await send();
    await waitFor(() => expect(router.state.location.pathname).toBe("/results"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/retry|background/i),
    );
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)!).submission).toBe("attempted");
  });
});

describe("contact gate guards", () => {
  it("sends people with no profile back to /start", async () => {
    await setBrowser({ url: "/contact" });
    const { router } = await renderRoute("/contact");
    expect(router.state.location.pathname).toBe("/start");
  });

  it("sends people with unanswered questions back to the first unanswered one", async () => {
    await setBrowser({
      progress: {
        role: "manager",
        team: "lt5",
        svc: "internal",
        answers: [...fill(2).slice(0, 3), ...Array(17).fill(null)],
      },
      url: "/contact",
    });
    const { router } = await renderRoute("/contact");
    expect(router.state.location.pathname).toBe("/q/4");
  });
});
