import type { AboutJobLink } from "./types";
import { aboutJobWords as words } from "./words";

/**
 * *Where to look yourself* (docs/ui-spec/cockpit/about-this-job.md, row 4): three sites' own general pages, each
 * a fixed address with no search words, no job code and nothing of the person's, so a link says nothing about
 * who opens it or which job they picked (the maintainer's call of 2026-10-20). The job's name and code are shown
 * beside them as text to copy instead. Each names its card in the source registry
 * (lib/engines/research-kit/v2026/registry.ts), which holds what DotAmi may do with the site: link only, never
 * fetch. tests/about-job.spec.ts checks every address against its card and against the no-search-words rule.
 */
export const ABOUT_JOB_LINKS: readonly AboutJobLink[] = [
  // Job Bank's own pages are never fetched (the job-bank-pages card); the person opens this one in their browser.
  { id: "job-bank", label: words.links.jobBank, url: "https://www.jobbank.gc.ca/trend-analysis/search-wages", card: "job-bank-pages" },
  { id: "bizpal", label: words.links.bizpal, url: "https://bizpal.ca/", card: "bizpal" },
  // Alberta's trade list: shown in Alberta only.
  { id: "tradesecrets", label: words.links.tradesecrets, url: "https://tradesecrets.alberta.ca/trades-in-alberta/profiles/", card: "alberta-tradesecrets" },
];

/** The links shown for an idea in a province: Tradesecrets in Alberta only. */
export function aboutJobLinksFor(province: string): readonly AboutJobLink[] {
  return ABOUT_JOB_LINKS.filter((link) => link.id !== "tradesecrets" || province === "AB");
}
