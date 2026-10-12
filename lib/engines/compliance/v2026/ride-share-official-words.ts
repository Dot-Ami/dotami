import type { OfficialWords } from "@/lib/engines/shared/types";

/**
 * The CRA's pages behind the ride-share and taxi cards (docs/engines/compliance.md § Work the $30,000
 * line doesn't cover). Change a quoted sentence only after reading it on its page, and move the read
 * date with it.
 */

/** The day a person read these pages for the words below. */
export const RIDE_SHARE_PAGES_READ = "2026-10-11";

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
