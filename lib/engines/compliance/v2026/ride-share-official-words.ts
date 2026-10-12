import type { OfficialWords, ToolCheck } from "@/lib/engines/shared/types";

/**
 * The pages behind the ride-share and taxi cards (docs/engines/compliance.md § Work the $30,000 line
 * doesn't cover), and how each was checked (the maintainer's option B, docs/engines/citations.md).
 * Only the platform-reporting page is recorded as read by a person: the maintainer read it himself
 * on 2026-10-11. Every other page carries a tool check: `node scripts/check-quotes.mjs` found the
 * quotes below on the live page on the day given, which says the words are there, not that a person
 * read the page. Change a quoted sentence only after the script finds it on its page, and record the
 * new check here.
 */

/** The day the maintainer read the CRA's page on the reporting rules for digital platforms. */
export const CRA_PLATFORM_REPORTING_READ = "2026-10-11";

/** The day the tool checks below were made. */
const RIDE_SHARE_TOOL_CHECKED_ON = "2026-10-12";

/**
 * The sharing-economy page: the two sentences on the card, the line on combined sales under $30,000
 * that the small-supplier card's "still decides" sentence rests on, and the example's line that food
 * delivery isn't commercial ride-sharing (why the keyword reader leaves "Uber Eats" out).
 */
export const CRA_SHARING_ECONOMY_TOOL_CHECK: ToolCheck = {
  checkedOn: RIDE_SHARE_TOOL_CHECKED_ON,
  quotes: [
    "You must register for a GST/HST account the moment you start earning money from commercial ridesharing services.",
    "The $30,000 small supplier threshold does not apply for commercial ridesharing services.",
    "If your combined taxable sales from commercial ridesharing services and other taxable sales is under $30,000, your mandatory GST/HST registration will generally only apply to your commercial ridesharing services unless you request otherwise.",
    "GST/HST is only charged on the sales from commercial ridesharing services but not from food delivery services.",
  ],
};

/** The taxi and ride-sharing page: registration even for a small supplier. */
export const CRA_TAXI_RIDE_SHARING_TOOL_CHECK: ToolCheck = {
  checkedOn: RIDE_SHARE_TOOL_CHECKED_ON,
  quotes: [
    "If you are a self-employed taxi operator or commercial ride-sharing driver who supplies taxable passenger transportation services, you must register for a GST/HST account even if you are a small supplier.",
  ],
};

/** GI-196: when registration takes effect, the 30 days to apply, and its example. */
export const CRA_GI_196_TOOL_CHECK: ToolCheck = {
  checkedOn: RIDE_SHARE_TOOL_CHECKED_ON,
  quotes: [
    "Although the effective date of registration will be the particular day on which the self-employed commercial ride-sharing driver starts to make taxable supplies, they are only required to apply to the CRA for registration before the thirtieth day after that particular day.",
    "A self-employed commercial ride-sharing driver makes a taxable supply of a commercial ride-sharing service on September 1, 2022.",
    "The commercial ride-sharing driver is required to apply for registration by September 30, 2022, and the effective date of registration would be September 1, 2022.",
  ],
};

/** Excise Tax Act s.240, on the Justice Laws site. */
export const ETA_240_URL = "https://laws-lois.justice.gc.ca/eng/acts/E-15/section-240.html";

/** Excise Tax Act s.240(1.1): a small supplier carrying on a taxi business must be registered. */
export const ETA_240_TOOL_CHECK: ToolCheck = {
  checkedOn: RIDE_SHARE_TOOL_CHECKED_ON,
  quotes: [
    "Notwithstanding subsection (1), every small supplier who carries on a taxi business is required to be registered for the purposes of this Part in respect of that business.",
  ],
};

/** Excise Tax Act s.123, on the Justice Laws site. */
export const ETA_123_URL = "https://laws-lois.justice.gc.ca/eng/acts/E-15/section-123.html";

/**
 * Excise Tax Act s.123(1), paragraph (b) of "taxi business": rides by motor vehicle arranged through
 * an electronic platform. The paragraph is long, with a parenthesis on what counts as a motor
 * vehicle, so the quotes are its opening words and the words on the platform.
 */
export const ETA_123_TOOL_CHECK: ToolCheck = {
  checkedOn: RIDE_SHARE_TOOL_CHECKED_ON,
  quotes: [
    "taxi business means",
    "a business carried on in Canada by a person of transporting passengers for fares by motor vehicle",
    "within a particular municipality and its environs if the transportation is arranged or coordinated through an electronic platform or system",
  ],
};

/** The CRA's sharing-economy page; its "Commercial ridesharing" section is quoted on the card. */
export const CRA_SHARING_ECONOMY_URL =
  "https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/platform-economy/sharing-economy.html";

/** The CRA's GST/HST page for taxi operators and commercial ride-sharing drivers. */
export const CRA_TAXI_RIDE_SHARING_URL =
  "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-specific-situations/taxi-ride-sharing-drivers.html";

/** GST/HST Info Sheet GI-196, GST/HST and Commercial Ride-sharing Services. */
export const CRA_GI_196_URL =
  "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/gi-196/gst-hst-commercial-ride-sharing-services.html";

/** The CRA's page on the reporting rules for digital platform operators. */
export const CRA_PLATFORM_REPORTING_URL =
  "https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/reporting-rules-digital-platforms.html";

/** Registration from the first ride, and the $30,000 line not applying, in the CRA's words. */
export const CRA_RIDESHARING_REGISTRATION: OfficialWords = {
  lead: "The Canada Revenue Agency, on commercial ridesharing:",
  passages: [
    {
      id: "cra-rideshare-register-first-ride",
      sentences: [
        "You must register for a GST/HST account the moment you start earning money from commercial ridesharing services.",
      ],
    },
    {
      id: "cra-rideshare-no-small-supplier-line",
      sentences: ["The $30,000 small supplier threshold does not apply for commercial ridesharing services."],
    },
  ],
  url: CRA_SHARING_ECONOMY_URL,
};

/**
 * What platform operators report, and that ride-share is among the activities, in the CRA's words.
 * The list item is quoted as the page prints it, after the sentence that introduces the list.
 */
export const CRA_PLATFORM_REPORTING: OfficialWords = {
  lead: "The Canada Revenue Agency, on the reporting rules for digital platforms:",
  passages: [
    {
      id: "cra-platform-operators-report",
      sentences: [
        "These platform operators have to collect detailed information on certain sellers.",
        "This information needs to be verified and reported to the Canada Revenue Agency (CRA) annually.",
      ],
    },
    {
      id: "cra-platform-rideshare-listed",
      sentences: [
        "Sellers who will have their information collected and reported to the CRA may include those who participate in the following activities:",
        "Rideshare and delivery services",
      ],
    },
  ],
  url: CRA_PLATFORM_REPORTING_URL,
};
