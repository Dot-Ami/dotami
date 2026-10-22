/**
 * Dead on 2026-10-13 and left for a person (tests/moved-government-pages.spec.ts holds them unchanged): the
 * Alberta Investor Tax Credit page (it answers page not found; news reports say the program ended in 2019, not
 * checked against an official page, so the entry itself may be out of date), and the two sources of the Retained
 * earnings planning stage, titled "Paying dividends" and "Salary or dividends", whose one old address was a
 * corporation-return line about dividends received; no current CRA page on either subject was found. Each stays
 * exactly as it was until a person decides.
 *
 * Its own file so the quality report (scripts/quality-report.mjs) counts the same dead addresses the test holds.
 */
export const STILL_DEAD: readonly { url: string; where: readonly string[] }[] = [
  { url: "https://www.alberta.ca/alberta-investor-tax-credit", where: ["grants grant-abti"] },
  {
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax/returns/completing-your-corporation-income-tax-t2-return/line-4600-dividends-received.html",
    where: [
      "cfe stage-4-retained-earnings-planning",
      "cfe stage-4-retained-earnings-planning",
      "roads road-starting-any-business-ab stage-4-retained-earnings-planning",
      "roads road-starting-any-business-ab stage-4-retained-earnings-planning",
    ],
  },
];
