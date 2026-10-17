import { normaliseSpaces } from "./text-pieces";

/**
 * No times (the maintainer, 2026-10-17: "no; no times at all … NO TIMES!", docs/architecture/
 * lens-comparisons.md § 1): DotAmi never writes a duration, a time gauge, a timeline or "fastest". Two kinds
 * of words are allowed through, each listed below with where it is and why:
 *
 * - **Your date** (the maintainer kept it on 2026-10-17): the person's own month and year, and the calendar
 *   months from today to it, which is arithmetic on their own answer (future-cockpit.md § 4, "Time: only
 *   months from today to your date").
 * - **Official requirement text**: a line written from an official page that states the page's own hours,
 *   weeks or months ("Official hour or training requirements are shown cited", same section). The road's
 *   step shows its source beside it.
 *
 * `findTimeWords` takes the allowed words out of a text first, then names what is left. The harness runs it
 * over every line DotAmi writes for an idea (tests/idea-harness.spec.ts), and tests/idea-invariants.spec.ts
 * checks each allowance is still in use, so a stale one can't sit here unnoticed.
 */

// The units of a duration, singular (a pattern adds "s?" where plurals are meant). "season" and "quarter"
// are left out of the plain list: "your busy season" and "a calendar quarter" (the CRA's GST tests) name a
// time of year, not a wait; "lasts a season" is caught below.
const UNIT = "(?:minute|hour|day|week|fortnight|month|semester|year|decade)";
// Number words: "eighteen", "twenty-four", "a dozen", "a few".
const NUMBER_WORD =
  "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|a hundred|a dozen|dozens of|a few|a couple of|several|many)";

export const TIME_PATTERNS: readonly { phrase: string; pattern: RegExp }[] = [
  // "3 weeks", "6-8 months", "18 months", "2 years", "40 hours", "6 mo.", and joined up: "a 30-day window",
  // "6-month".
  {
    phrase: "a duration",
    pattern: new RegExp(
      `\\b\\d[\\d,.]*(?:\\s*(?:-|–|to)\\s*\\d[\\d,.]*)?(?:\\s*|\\s*-\\s*)(?:${UNIT}s?|hrs?|yrs?|mos?\\b\\.?)(?![a-z])`,
      "i",
    ),
  },
  // "two weeks", "eighteen months", "twenty-four months", "a few months", "several years", "a one-year
  // course". Not "a year" on its own: "$70,000 a year" is a rate, not a wait (see "a year, as a wait").
  {
    phrase: "a duration in words",
    pattern: new RegExp(`\\b${NUMBER_WORD}(?:[\\s-]+${NUMBER_WORD})*(?:\\s+|\\s*-\\s*)${UNIT}s?\\b`, "i"),
  },
  // "a year-long course", "month-long".
  { phrase: "a duration in words", pattern: new RegExp(`\\b${UNIT}s?[\\s-]long\\b`, "i") },
  // A decade, a fortnight and a semester are only ever lengths of time.
  { phrase: "a duration in words", pattern: /\b(?:decades?|fortnights?|semesters?)\b/i },
  // "lasts a season", "for a season".
  { phrase: "a duration in words", pattern: /\b(?:last|lasts|lasting|for|over|in|within|takes?|taking)\s+(?:a|one|the|a whole|a full)\s+seasons?\b/i },
  // "in a year", "within a week of applying", "plan for a month", "about a year", "allow half a year".
  {
    phrase: "a year, as a wait",
    pattern: new RegExp(
      `\\b(?:in|within|for|over|under|after|about|around|roughly|nearly|almost|up to|at least|at most|allow|take|takes|taking)\\s+(?:a|an|one|half an?|a half|a whole|a full)\\s+${UNIT}\\b`,
      "i",
    ),
  },
  // "over the next year", "within the year", "in the coming months".
  {
    phrase: "a year, as a wait",
    pattern: new RegExp(`\\b(?:in|within|over|during|by)\\s+(?:the|this|next|the next|the coming|the following)\\s+(?:few\\s+)?${UNIT}s?\\b`, "i"),
  },
  // "It takes a while", "a long time", "in no time".
  { phrase: "a while", pattern: /\b(?:a (?:little |long |short |good |great )?while|a long time|a short time|in no time|no time at all)\b/i },
  { phrase: "half a year", pattern: new RegExp(`\\bhalf an?\\s+${UNIT}\\b|\\b(?:an?|one)\\s+${UNIT}\\s+and a half\\b`, "i") },
  { phrase: "takes about", pattern: /\btakes?\s+(?:about|around|roughly|approximately|up to|at least|only|just|\d)/i },
  { phrase: "how long", pattern: /\bhow long\b/i },
  { phrase: "months to", pattern: new RegExp(`\\b${UNIT}s?\\s+(?:to|until|till|before)\\b`, "i") },
  // "fastest" in other words: "quick", "quickly", "speedy", "rapid", "swift". Not "fast food".
  {
    phrase: "fastest",
    pattern: /\b(?:fast(?:er|est)?(?!\s+food)|quick(?:er|est|ly)?|soonest|sooner|shortest|speed(?:y|ier|iest|ily)|rapid(?:ly)?|swift(?:ly|er|est)?)\b/i,
  },
  { phrase: "timeline", pattern: /\btime[- ]?lines?\b/i },
  { phrase: "time to", pattern: /\btime to (?:open|launch|start|finish|complete|get|market|revenue|profit)\b/i },
  { phrase: "ETA", pattern: /\b(?:ETA|estimated time|time estimate)\b/i },
];

/** Words DotAmi may write about time, and why. */
export interface TimeAllowance {
  /** The words, exactly as written. */
  text: string;
  /** Where they are written, so a reader can check them. */
  where: string;
  why: string;
}

/**
 * The person's own date (Your date): the cockpit's words about the months to it. The words for a given
 * count of months come from lib/roads/words.ts `monthsFromToday`, which the harness takes out separately for
 * each idea's own month (`dateWords` below), since the count changes with the month.
 */
export const YOUR_DATE_ALLOWANCES: readonly TimeAllowance[] = [
  {
    text: "Add your month and year to count the months to it",
    where: "lib/cockpit/words.ts gauges.date.invite",
    why: "Your date: the person's own month, which only they set; DotAmi counts the calendar months to it and nothing else.",
  },
  {
    text: "Only you set it. DotAmi counts the months to it and nothing else.",
    where: "lib/cockpit/words.ts lists.dateHelp and questions.date.why (shown beside Your date's box)",
    why: "Your date: says the month is the person's own and that the count of calendar months to it is all DotAmi does with it.",
  },
];

const ROAD_0 = "lib/engines/roads/v2026/starting-any-business-ab.ts";
const ROAD_1 = "lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts";
const RECORDS = "lib/engines/roads/v2026/keep-records.ts";
const official = (text: string, where: string, why: string): TimeAllowance => ({ text, where, why });

/**
 * Official requirement text a road's step states from its official page: a period the law or the program
 * sets, which the person must meet (keep records six years, register within 29 days, 1,360 hours a period),
 * shown with that page as the line's source. One entry per line: tests/idea-invariants.spec.ts reads every
 * line the written roads hold and fails on one with a time that is neither listed here nor a known gap. A line that says how long something takes or will take is not a requirement and is never listed
 * here (road 1's "each designed to take about a year" is a known gap instead, tests/fixtures/ideas/known-gaps.ts).
 */
export const OFFICIAL_TIME_ALLOWANCES: readonly TimeAllowance[] = [
  official(
    "The CRA says that, by law, anyone carrying on a business keeps records of its transactions and the documents behind them, generally for six years from the end of the last tax year they relate to, and for a different period in some situations.",
    `${RECORDS} (summary of every road's Keep your records step)`,
    "The CRA's records-retention period: a legal requirement, cited on the step.",
  ),
  official(
    "You keep them at your place of business or your residence in Canada (unless the CRA gives you written permission to keep them elsewhere); the CRA notes that records kept outside Canada and accessed electronically from Canada are not considered to be kept in Canada. You keep them generally for six years from the end of the last tax year they relate to: for an individual that is the calendar year, for a corporation its fiscal period. The CRA lists situations with a different period, among them indefinitely for records about long-term acquisitions and disposal of property, and, for an income tax return filed late, six years from the date you file that return. Destroying them sooner needs the CRA's written permission first.",
    `${RECORDS} (done-when line)`,
    "The CRA's retention periods and its rule on destroying records early: legal requirements, cited.",
  ),
  official(
    "Where to keep your records, for how long and how to request the permission to destroy them early (CRA)",
    `${RECORDS} (the source's title)`,
    "The CRA page's own title, shown as the source's name.",
  ),
  official(
    "You keep the account's deposit slips, bank statements and cancelled cheques with your records, generally for at least six years from the end of the last tax year they relate to.",
    `${ROAD_0} step-start-business-account (done-when line)`,
    "The CRA's records-retention period, cited.",
  ),
  official(
    "You keep a record of your daily income and expenses, get a receipt or other voucher for each business purchase, and keep these records for at least six years from the end of the last tax year they relate to (the CRA says you are generally required to).",
    `${ROAD_0} stage-1-sole-prop-activation (done-when line)`,
    "The CRA's records-retention period, cited.",
  ),
  official(
    "You registered by choice for a GST/HST (Goods and Services Tax / Harmonized Sales Tax) account while still a small supplier; your registration usually takes effect the day you asked, or up to 30 days before.",
    `${ROAD_0} stage-2a-voluntary-gst-registration (done-when line)`,
    "The CRA's rule for a voluntary registration's effective date: which day it counts from, not a wait.",
  ),
  official(
    "You know you must stay registered for at least one year before you can cancel, unless you stop your commercial activities.",
    `${ROAD_0} stage-2a-voluntary-gst-registration (done-when line)`,
    "The CRA's minimum registration period: a legal requirement, cited.",
  ),
  official(
    "If you went over $30,000 in a single calendar quarter, you charge GST/HST on the sale that took you over, and register within 29 days of your effective date of registration.",
    `${ROAD_0} stage-2b-mandatory-gst-registration (done-when line)`,
    "The CRA's registration deadline: a legal requirement, cited.",
  ),
  official(
    "If you went over $30,000 across the previous four (or fewer) calendar quarters, you stop being a small supplier at the end of the month after that quarter, and register within 29 days of your effective date of registration.",
    `${ROAD_0} stage-2b-mandatory-gst-registration (done-when line)`,
    "The CRA's registration deadline: a legal requirement, cited.",
  ),
  official(
    "You know the corporation files a T2 Corporation Income Tax Return no later than six months after the end of every tax year, even if it owes no tax.",
    `${ROAD_0} stage-3a-incorporation-80k-net (done-when line)`,
    "The CRA's T2 filing deadline: a legal requirement, cited.",
  ),
  official(
    "If your industry must have workers' compensation coverage, you opened a WCB-Alberta (Workers' Compensation Board) account within 15 days of hiring your first worker.",
    `${ROAD_0} branch-hire-first-employee (done-when line)`,
    "WCB-Alberta's account deadline: a legal requirement, cited.",
  ),
  official(
    "You filed by the SR&ED reporting deadline (for a corporation, generally 18 months after its tax year end); a claim can't be filed or changed after it.",
    `${ROAD_0} stage-4-sred-deepening (done-when line)`,
    "The CRA's SR&ED reporting deadline: a legal requirement, cited.",
  ),
  official(
    "The $150 application fee is paid within 45 days, or the application is deleted.",
    `${ROAD_1} step-shop-register-apprentice (done-when line)`,
    "Apprenticeship and Industry Training's payment deadline: a program requirement, cited.",
  ),
  official(
    "If you have a sponsor, they confirm your application by email within 30 days.",
    `${ROAD_1} step-shop-register-apprentice (done-when line)`,
    "The program's deadline for a sponsor's confirmation: a requirement of the application, cited.",
  ),
  official(
    "(Optional) You completed a Career and Technology Studies (CTS) apprenticeship pathway and sent a Prior Learning Assessment application; a mark of 70% or higher on its exam earns credit for first-period classes. The application is free on a first attempt within three years of finishing high school.",
    `${ROAD_1} step-shop-register-apprentice (done-when line)`,
    "The program's eligibility window for a free application: a condition the page sets, cited.",
  ),
  official(
    "In each period, you earned 1,360 hours of work experience and showed competence in the record book's activities.",
    `${ROAD_1} step-shop-sponsor-hours (done-when line)`,
    "The trade's on-the-job hours per period: an official training requirement, cited.",
  ),
  official(
    "Each period, you spend 8 weeks in class at NAIT (the Northern Alberta Institute of Technology) or SAIT (the Southern Alberta Institute of Technology) and pass a theory exam.",
    `${ROAD_1} step-shop-classroom-exams (summary)`,
    "The trade's classroom instruction per period: an official training requirement, cited.",
  ),
  official(
    "You attended 8 weeks of classroom instruction in each period, at NAIT or SAIT.",
    `${ROAD_1} step-shop-classroom-exams (done-when line)`,
    "The trade's classroom instruction per period: an official training requirement, cited.",
  ),
  official(
    "You can show 72 months and 8,160 hours of verifiable Cabinetmaker work experience.",
    `${ROAD_1} step-shop-tq-work-experience (done-when line)`,
    "The Trades Qualifier's work-experience requirement, cited.",
  ),
  official(
    "Those months and hours count full-time work (more than 30 hours a week); part-time work is counted by the trade's approved industry average.",
    `${ROAD_1} step-shop-tq-work-experience (done-when line)`,
    "The program's definition of full-time work for that requirement, cited.",
  ),
  official(
    "You have a current Alberta employer in the trade, or had one within a year of applying.",
    `${ROAD_1} step-shop-tq-work-experience (done-when line)`,
    "The Trades Qualifier's employer condition: the person has had an Alberta employer in the trade within a year of the application date, cited.",
  ),
  official(
    "You finished every requirement within 18 months of your application's approval date.",
    `${ROAD_1} step-shop-tq-recognized-credential (done-when line)`,
    "The program's completion deadline: a requirement, cited.",
  ),
  official(
    "Your certificate isn't expired, and won't expire for at least 6 weeks from the day you apply.",
    `${ROAD_1} step-shop-tq-recognized-credential (done-when line)`,
    "The program's condition on the certificate's expiry: a requirement, cited.",
  ),
  official(
    "Trades Qualifier, work experience: you finished every requirement within 18 months, and your certificate was mailed to you.",
    `${ROAD_1} step-shop-journeyperson-certificate (done-when line)`,
    "The program's completion deadline: a requirement, cited.",
  ),
  official(
    "Trades Qualifier, recognized credential: you finished every requirement within 18 months, and your certificate was mailed to you.",
    `${ROAD_1} step-shop-journeyperson-certificate (done-when line)`,
    "The program's completion deadline: a requirement, cited.",
  ),
  official(
    "If you've already tried the exam two or more times: you did at least 40 hours of more study and sent a Training Plan with your application.",
    `${ROAD_1} step-shop-red-seal (done-when line)`,
    "The Red Seal program's study requirement for a third attempt, cited.",
  ),
  official(
    "An optional Alberta certificate for business skills, after at least 150 hours of approved study.",
    `${ROAD_1} step-shop-blue-seal (summary)`,
    "The Blue Seal's study requirement, cited.",
  ),
  official(
    "You completed at least 150 hours of study through approved programs, courses in the approved subject areas from a recognized training provider, or both.",
    `${ROAD_1} step-shop-blue-seal (done-when line)`,
    "The Blue Seal's study requirement, cited.",
  ),
  official(
    "You checked your taxable revenues against both of the CRA's tests: a single calendar quarter on its own, and the previous four (or fewer) consecutive calendar quarters. What counts is all revenues before expenses from your worldwide taxable supplies, and those of your associates (the CRA's word); as a sole proprietor, from all your businesses, not just this shop. A calendar quarter is three months starting on the first of January, April, July or October.",
    `${ROAD_1} step-shop-gst-small-supplier (done-when line)`,
    "The CRA's definition of a calendar quarter for its small-supplier tests, cited.",
  ),
  official(
    "If your industry must have workers' compensation coverage, you opened a WCB-Alberta account within 15 days of hiring your first worker.",
    `${ROAD_1} step-shop-first-hire (done-when line)`,
    "WCB-Alberta's account deadline: a legal requirement, cited.",
  ),
];

/** Every allowance, in the order they are taken out of a text. */
export const TIME_ALLOWANCES: readonly TimeAllowance[] = [...YOUR_DATE_ALLOWANCES, ...OFFICIAL_TIME_ALLOWANCES];

/**
 * The time words left in a text once its allowed words are taken out. `dateWords` are the words for the
 * person's own date in this run ("19 months from today"), which are allowed wherever they appear.
 */
export function findTimeWords(text: string, dateWords: readonly string[] = []): string[] {
  let rest = normaliseSpaces(text);
  for (const allowed of [...TIME_ALLOWANCES.map((a) => a.text), ...dateWords]) {
    rest = rest.split(normaliseSpaces(allowed)).join(" ");
  }
  const found: string[] = [];
  for (const { phrase, pattern } of TIME_PATTERNS) {
    const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const match of rest.matchAll(global)) {
      const at = match.index ?? 0;
      found.push(`${phrase}: “…${rest.slice(Math.max(0, at - 50), at + match[0].length + 50).trim()}…”`);
    }
  }
  return found;
}
