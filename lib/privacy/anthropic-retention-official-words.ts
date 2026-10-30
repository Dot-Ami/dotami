import type { CitationCheck, ToolCheck } from "@/lib/engines/shared/types";

/** Anthropic's own page on how long it keeps what is sent to its API (the page dates itself 2026-07-01). */
export const ANTHROPIC_RETENTION_URL =
  "https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data";

/**
 * How long Anthropic keeps what the intake's parser sends, in its own words (the maintainer's decision 2 of
 * 2026-10-24: a provider's period is quoted word for word under a label, with the day read, never put in
 * DotAmi's words). `node scripts/check-quotes.mjs` found every one of these on the live page on the day
 * given. It says the words are there, not that a person read the page.
 *
 * The parser calls the Anthropic API with the copy's own key, so the first five are the page's lines for API
 * users: the period and all four exceptions it lists, since DotAmi can't know which one applies. The screen
 * draws them after "Words found on the page:". The last two are two sections whose reach to API inputs the
 * page doesn't state, its line on Covered Models and its longer period for a chat flagged as violating the
 * Usage Policy, in the order the page has them. The maintainer asked for both on 2026-10-29 ("Add both
 * lines"), so the screen draws them after the five under a label of their own, "Anthropic's page also
 * says:", and says nothing of whom they reach. Left out: the page's periods for deleted and incognito chats
 * and for feedback (about chats and feedback, not the API), and its closing paragraph, "In all cases, we may
 * retain your chats or sessions as required by law…" (about chats and sessions; not quoted on screen).
 * Change a quote only after the script finds it on the page, and record the new check here.
 * `node scripts/check-quotes.mjs` with no arguments doesn't re-check this one (it reads the catalogs'
 * citations only): run it with `--url` and all seven quotes, once, so there is one check and one day.
 *
 * The screen never draws these lists as they are. It reads the words of the check it shows
 * (`toolCheckQuotes(ANTHROPIC_RETENTION_CHECK)`, so a person's read of the page, which outranks a tool check,
 * hides them all, as on every other screen) and splits those under the two labels with
 * `anthropicRetentionQuotesToDraw`.
 */
const FOR_API_USERS: readonly string[] = [
  "For Anthropic API users, we automatically delete inputs and outputs on our backend within 30 days of receipt or generation, except:",
  "When you use a service with longer retention under your control (e.g. Files API)",
  "When you and we have agreed otherwise (e.g. zero data retention agreement)",
  "If we need to retain them for longer to enforce our Usage Policy (UP)",
  "In compliance with the law",
];
const ALSO_SAYS: readonly string[] = [
  "Additionally, for Covered Models, we require limited data retention and review as a part of our safety work.",
  "We retain inputs and outputs for up to 2 years and trust and safety classification scores for up to 7 years if your chat is flagged by our automated trust and safety systems as violating our Usage Policy.",
];

export const ANTHROPIC_RETENTION_TOOL_CHECK: ToolCheck = {
  checkedOn: "2026-10-29",
  quotes: [...FOR_API_USERS, ...ALSO_SAYS],
};

/** The check the page shows beside the link: a tool check only, so it says no person has read the page. */
export const ANTHROPIC_RETENTION_CHECK: CitationCheck = { toolCheck: ANTHROPIC_RETENTION_TOOL_CHECK };

/**
 * The words the check on screen lists (`toolCheckQuotes(check)`: none once a person's read is recorded), split
 * under the screen's two labels: the five for API users after "Words found on the page:", then the two after
 * "Anthropic's page also says:". Each keeps the order of the words it was given.
 */
export function anthropicRetentionQuotesToDraw(shown: readonly string[]): {
  forApiUsers: readonly string[];
  alsoSays: readonly string[];
} {
  return {
    forApiUsers: shown.filter((quote) => FOR_API_USERS.includes(quote)),
    alsoSays: shown.filter((quote) => ALSO_SAYS.includes(quote)),
  };
}
