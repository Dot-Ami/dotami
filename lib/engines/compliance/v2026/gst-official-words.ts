import type { OfficialWords, ToolCheck } from "@/lib/engines/shared/types";

/** The CRA page both GST/HST cards cite for the small-supplier test. */
export const CRA_WHEN_TO_REGISTER_URL =
  "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html";

/**
 * How the words below were checked on that page (the maintainer's option B, 2026-10-11;
 * docs/engines/citations.md): `node scripts/check-quotes.mjs` found every one of these quotes on the
 * live page on the day given. It says the words are there, not that a person read the page. Every
 * citation of the page that these words rest on carries this as its `toolCheck`. The maintainer read
 * the page in full on 2026-10-25, so those citations also carry his read, which wins on screen
 * (docs/engines/citations.md, § The maintainer's reads of 2026-10-25).
 *
 * The page puts a footnote number straight after "threshold" in its two tests ("threshold1"), so the
 * tool can't find those two sentences as typed: what it found is the words on each side of that number
 * ("You exceed the $30,000" and the rest of each sentence). The cards show the sentences without the
 * footnote numbers, as a person reads them (tests/honest-map.spec.ts checks every sentence is covered).
 */
export const CRA_WHEN_TO_REGISTER_TOOL_CHECK: ToolCheck = {
  checkedOn: "2026-10-12",
  quotes: [
    "You exceed the $30,000",
    "in a single calendar quarter.",
    "You are no longer a small supplier and have to charge GST/HST on the supply that made you exceed $30,000 within the calendar quarter.",
    "You must register for the GST/HST.",
    "Your effective date of registration is no later than the day of the supply that made you exceed $30,000.",
    "over the previous four (or fewer) consecutive calendar quarters (but not in a single calendar quarter).",
    "You are no longer a small supplier at the end of the month following the quarter in which you exceed $30,000.",
    "You have to register for the GST/HST.",
    "Your effective date of registration is no later than the day of the first supply you make after you are no longer a small supplier.",
    "You may choose to register voluntarily if you make taxable sales, leases, or other supplies in Canada.",
  ],
};

/**
 * The CRA's two small-supplier tests, word for word, each with what the page says follows and from
 * when. Both GST/HST cards show these instead of a paraphrase: the old wording ("over four
 * consecutive calendar quarters", "Wait for $30K") dropped the CRA's "(or fewer)" and could be read
 * as each quarter. Change a sentence only after `node scripts/check-quotes.mjs` finds it on the page,
 * and record the new check in `CRA_WHEN_TO_REGISTER_TOOL_CHECK`.
 */
export const CRA_SMALL_SUPPLIER_TESTS: OfficialWords = {
  lead: "The Canada Revenue Agency's two tests, quoted from its page:",
  passages: [
    {
      id: "cra-gst-single-quarter",
      sentences: [
        "You exceed the $30,000 threshold in a single calendar quarter.",
        "You are no longer a small supplier and have to charge GST/HST on the supply that made you exceed $30,000 within the calendar quarter.",
        "You must register for the GST/HST.",
        "Your effective date of registration is no later than the day of the supply that made you exceed $30,000.",
      ],
    },
    {
      id: "cra-gst-four-quarters",
      sentences: [
        "You exceed the $30,000 threshold over the previous four (or fewer) consecutive calendar quarters (but not in a single calendar quarter).",
        "You are no longer a small supplier at the end of the month following the quarter in which you exceed $30,000.",
        "You have to register for the GST/HST.",
        "Your effective date of registration is no later than the day of the first supply you make after you are no longer a small supplier.",
      ],
    },
  ],
  url: CRA_WHEN_TO_REGISTER_URL,
};

/** The same page's one line on registering by choice, for the voluntary stage. */
export const CRA_VOLUNTARY_REGISTRATION: OfficialWords = {
  lead: "The Canada Revenue Agency, on the same page:",
  passages: [
    {
      id: "cra-gst-voluntary",
      sentences: ["You may choose to register voluntarily if you make taxable sales, leases, or other supplies in Canada."],
    },
  ],
  url: CRA_WHEN_TO_REGISTER_URL,
};

/**
 * What the same page says a sole proprietor counts toward the two tests, and what no one counts (its
 * footnote). Sole Prop activation's note on the tests quotes them (since 2026-10-24, the maintainer's
 * reading list: not "gross revenue" but what the CRA counts), and road 0's dw-start-gstman-tests line
 * rests on them, so the two can't drift. `node scripts/check-quotes.mjs` found each on the page on
 * 2026-10-12 (road 0's check of that day), and the reading list found them there again on 2026-10-23.
 * The footnote's sentence is quoted in two parts: a glossary link inside it leaves a space before the
 * comma after "capital property", so the whole sentence doesn't match.
 */
export const CRA_SOLE_PROPRIETOR_COUNTS =
  "If you are a sole proprietor, include the total amount of all revenues (before expenses) from your worldwide taxable supplies from all your businesses and those of your associates (if they were associated at the beginning of the particular calendar quarter).";
export const CRA_NOT_COUNTED = [
  "do not include revenues from supplies of financial services, sales of capital property",
  "and goodwill from the sale of a business.",
] as const;
