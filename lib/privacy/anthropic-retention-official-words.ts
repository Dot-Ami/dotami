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
 * The parser calls the Anthropic API with the copy's own key, so these are the page's lines for API users:
 * the period and all four exceptions it lists, since DotAmi can't know which one applies. Left out: the
 * page's periods for deleted and incognito chats and for feedback (about chats and feedback, not the API),
 * and two sections whose reach the page doesn't state for API inputs, its longer period for a chat flagged
 * as violating the Usage Policy and its line on Covered Models. Whether to quote those two under the same
 * label is the maintainer's call (docs/task-list.md). Change a quote only after the script finds it on the
 * page, and record the new check here. `node scripts/check-quotes.mjs` with no arguments doesn't re-check
 * this one (it reads the catalogs' citations only): run it with `--url` and these quotes.
 */
export const ANTHROPIC_RETENTION_TOOL_CHECK: ToolCheck = {
  checkedOn: "2026-10-27",
  quotes: [
    "For Anthropic API users, we automatically delete inputs and outputs on our backend within 30 days of receipt or generation, except:",
    "When you use a service with longer retention under your control (e.g. Files API)",
    "When you and we have agreed otherwise (e.g. zero data retention agreement)",
    "If we need to retain them for longer to enforce our Usage Policy (UP)",
    "In compliance with the law",
  ],
};

/** The check the page shows beside the link: a tool check only, so it says no person has read the page. */
export const ANTHROPIC_RETENTION_CHECK: CitationCheck = { toolCheck: ANTHROPIC_RETENTION_TOOL_CHECK };
