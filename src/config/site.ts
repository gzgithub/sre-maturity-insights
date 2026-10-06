/**
 * Site-level constants. This app is a separate website from the author's blog:
 * it has its own operator identity, contact address and privacy policy.
 *
 * BEFORE LAUNCH: replace every TODO_ placeholder below (see README "Before launch").
 */
export const site = {
  /** The site name is translated: use t("common:site.name"). */
  siteNameKey: "common:site.name",
  // TODO: set the real operator (data controller) name. No default on purpose — do not reuse the blog's brand.
  operatorName: "TODO_OPERATOR_NAME",
  // TODO: set a contact address dedicated to this app (privacy / deletion requests).
  contactEmail: "privacy@example.com",
  // TODO: decide the retention period for submissions (e.g. "24 months").
  retentionPeriod: "TODO_RETENTION_PERIOD",
  /** Used ONLY for outbound article links. Never for privacy, scripts or embeds. */
  blogUrl: "https://dockerdevops.blogspot.com/",
  consentVersion: "2026-10-v1",
  appVersion: "0.1.0",
} as const;
