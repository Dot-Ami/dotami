import type { OfficialWords } from "@/lib/engines/shared/types";

/** The CRA page both GST/HST cards cite for the small-supplier test. */
export const CRA_WHEN_TO_REGISTER_URL =
  "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html";

/**
 * The day these words were read on that page (its "Page details" date then: 2026-06-16). Every
 * citation of the page that these quotes rest on carries this as its `lastVerified`.
 */
export const CRA_WHEN_TO_REGISTER_READ = "2026-10-11";

/**
 * The CRA's two small-supplier tests, word for word, each with what the page says follows and from
 * when. Both GST/HST cards show these instead of a paraphrase: the old wording ("over four
 * consecutive calendar quarters", "Wait for $30K") dropped the CRA's "(or fewer)" and could be read
 * as each quarter. Change a sentence only after reading it on the page, and move the read date.
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
