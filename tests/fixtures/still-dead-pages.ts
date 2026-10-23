/**
 * Dead on 2026-10-13 and left for a person (tests/moved-government-pages.spec.ts holds them unchanged): the two
 * sources of the Retained earnings planning stage, titled "Paying dividends" and "Salary or dividends", whose one old address was a
 * corporation-return line about dividends received; no current CRA page on either subject was found. Each stays
 * exactly as it was until a person decides.
 *
 * The Alberta Investor Tax Credit page, dead on 2026-10-13 too, left the list on 2026-10-23 with the program itself:
 * the maintainer took it off the catalog (a-call-1; lib/engines/grants/v2026/programs.ts `RETIRED_GRANT_PROGRAMS`).
 *
 * Its own file so the quality report (scripts/quality-report.mjs) counts the same dead addresses the test holds.
 */
export const STILL_DEAD: readonly { url: string; where: readonly string[] }[] = [
  {
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax/returns/completing-your-corporation-income-tax-t2-return/line-4600-dividends-received.html",
    where: [
      "cfe stage-4-retained-earnings-planning",
      "cfe stage-4-retained-earnings-planning",
      "roads road-starting-any-business-ab stage-4-retained-earnings-planning",
      "roads road-starting-any-business-ab stage-4-retained-earnings-planning",
      // The federal steps (2026-10-21, task 28d) keep road 0's map stages as they are, this one's sources too.
      "roads road-federal-steps-ca stage-4-retained-earnings-planning",
      "roads road-federal-steps-ca stage-4-retained-earnings-planning",
    ],
  },
];
