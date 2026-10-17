import type { CitationAuthority, EngineCitation, Province } from "../../shared/types";
import type { OfficialFee } from "./types";

/**
 * Every official fee DotAmi shows, each written once (docs/engines/fees.md). A road's cost line or a way
 * to incorporate names one by id and copies its amount (`feeLine`, `routeFeeLine`), so a fee that changes
 * is changed here and nowhere else.
 *
 * Every source is a tool check (option B, docs/engines/citations.md): `node scripts/check-quotes.mjs`
 * found each quote below, word for word, on its live page on CHECKED_ON (or, for a fee added later, on
 * its own day), and each fee's quotes hold its amount as the page writes it. Nobody is recorded as having
 * read these pages, so none has a read date. The pages' titles and notes are the ones the roads and the
 * incorporation routes already showed, so a card that cites one looks exactly as before.
 *
 * Not here: Alberta's registry fees (incorporating, registering a name, annual returns). They sit in the
 * Registry Agent Product Catalogue, which stops tools with a human check (checked again on 2026-10-15:
 * its open.alberta.ca page answers a tool with Cloudflare's "Just a moment…" and a 403, and the catalogue
 * itself is a PDF, which the quote check doesn't read); alberta.ca's own pages on registering a name and on
 * registry agents say a government fee exists but give no amount. They stay named blanks until a person
 * reads them in the catalogue. Never take an amount from a search result's summary.
 */

/** The day scripts/check-quotes.mjs found every quote below on its page. */
const CHECKED_ON = "2026-10-12";

/** The day the first written future's blanks were looked up again (build list item 19). */
const BLANKS_CHECKED_ON = "2026-10-15";

interface Page {
  title: string;
  authority: CitationAuthority;
  jurisdiction: Province;
  url: string;
  note: string;
}

const TRADESECRETS = "https://tradesecrets.alberta.ca";

const PAGES = {
  isedFees: {
    title: "Corporations Canada: Services, fees and processing times",
    authority: "federal",
    jurisdiction: "CA",
    url: "https://ised-isde.canada.ca/site/corporations-canada/en/services-fees-and-processing-times",
    note: "Online fees for incorporating a business corporation and filing its annual return (date modified 2025-05-06). The page adds: \"All processing times mentioned are business days or hours.\"",
  },
  apply: {
    title: "Apply for an Apprenticeship Education Program (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/get-started/become-an-apprentice/apply-for-apprenticeship/`,
    note: "How to apply to become a registered apprentice in Alberta, what to have ready, and the application fee.",
  },
  profile: {
    title: "Cabinetmaker trade profile (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/trades-in-alberta/profiles/0361/`,
    note: "Alberta's profile of the Cabinetmaker trade: its programs, periods, hours, exams, certification and who may do its restricted work.",
  },
  tqWorkExperience: {
    title: "Trades Qualifier, Work Experience Program: program details (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/trades-qualifier-programs/qualify-based-on-work-experience/program-details/`,
    note: "Qualifying for an Alberta certificate on work experience in the trade, without an apprenticeship.",
  },
  tqCredential: {
    title: "Trades Qualifier, Recognized Credential Program: program details (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/trades-qualifier-programs/qualify-for-alberta-certification/program-details/`,
    note: "Qualifying for an Alberta certificate with a recognized trade certificate from outside Alberta.",
  },
  applyOnline: {
    title: "Apply Online (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/mytradesecrets/apply-online/`,
    note: "The apprenticeship and certification programs and services you can apply for online, each with its fee.",
  },
  blueSeal: {
    title: "Blue Seal Program (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/business-competencies-blue-seal/`,
    note: "The Achievement in Business Competencies (Blue Seal) certificate: who can apply, how, and the fee.",
  },
  commonBusinessNumber: {
    title: "Common Business Number program in Alberta (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/common-business-number-program-in-alberta",
    note: "In Alberta, registering a business also gets it a federal business number.",
  },
} as const satisfies Record<string, Page>;

/** A citation of one page: the quotes the tool found there on CHECKED_ON. Never a read date. */
function checked(page: Page, ...quotes: string[]): EngineCitation {
  return checkedOn(CHECKED_ON, page, ...quotes);
}

/** The same, for a fee whose page the tool checked on another day. */
function checkedOn(day: string, page: Page, ...quotes: string[]): EngineCitation {
  const { title, authority, jurisdiction, url, note } = page;
  return { title, authority, jurisdiction, url, note, toolCheck: { checkedOn: day, quotes } };
}

export const officialFeesV2026: readonly OfficialFee[] = [
  // ---- Federal (Corporations Canada), shown on the federal way to incorporate -----------------------
  {
    id: "fee-ca-incorporation-online",
    label: "Incorporating a business corporation online with Corporations Canada",
    place: "CA",
    amountCents: 200_00,
    per: "once",
    citation: checked(PAGES.isedFees, "It will cost $200 and will take 1 day."),
  },
  {
    id: "fee-ca-incorporation-express",
    label: "Express service on an online federal incorporation",
    place: "CA",
    amountCents: 100_00,
    per: "once",
    citation: checked(PAGES.isedFees, "Add $100 for express service in 4 hours."),
  },
  {
    id: "fee-ca-annual-return-online",
    label: "Filing a federal corporation's annual return online",
    place: "CA",
    amountCents: 12_00,
    per: "year",
    citation: checked(PAGES.isedFees, "It will cost $12 and will take 1 day."),
  },

  // ---- Alberta: apprenticeship and trade certification (Tradesecrets), on the first written future ----
  {
    id: "fee-ab-apprenticeship-application",
    label: "Applying for an Apprenticeship Education Program in Alberta",
    place: "CA-AB",
    amountCents: 150_00,
    citation: checked(
      PAGES.apply,
      "A $150 non-refundable application fee is required.",
      "Your sponsor also has the option to pay your $150 application fee for you at this stage.",
    ),
  },
  {
    id: "fee-ab-trades-qualifier-work-experience-application",
    label: "Applying to the Trades Qualifier Work Experience Program in Alberta",
    place: "CA-AB",
    amountCents: 450_00,
    citation: checked(PAGES.tqWorkExperience, "Pay the non-refundable $450 (Canadian) application fee."),
  },
  {
    // One fee, shown on two steps (both Trades Qualifier routes), each line in its own words.
    id: "fee-ab-cabinetmaker-practical-exam",
    label: "The Cabinetmaker practical exam in Alberta",
    place: "CA-AB",
    amountCents: 160_00,
    citation: checked(PAGES.profile, "Pass a practical exam ($160.00)."),
  },
  {
    id: "fee-ab-trades-qualifier-recognized-credential-application",
    label: "Applying to the Trades Qualifier Recognized Credential Program in Alberta",
    place: "CA-AB",
    amountCents: 150_00,
    citation: checked(PAGES.tqCredential, "Pay the non-refundable $150 (CAD) application fee."),
  },
  {
    id: "fee-ab-trades-qualifier-recognized-credential-rewrite",
    label: "A second attempt at a Recognized Credential Program exam (only if you fail one)",
    place: "CA-AB",
    amountCents: 50_00,
    onlyIf: "You failed an exam and choose to rewrite it.",
    citation: checked(
      PAGES.tqCredential,
      "If you fail an exam (pass mark is 70%), you may pay a $50 rewrite fee for a second attempt.",
    ),
  },
  {
    id: "fee-ab-blue-seal-application",
    label: "Applying for the Blue Seal (Achievement in Business Competencies) certificate",
    place: "CA-AB",
    amountCents: 150_00,
    citation: checked(PAGES.blueSeal, "There is a $150.00 non-refundable application fee."),
  },
  {
    // The Red Seal page says to "pay for" the application but gives no amount; the Apply Online page lists
    // it, under its programs for experienced workers. That application is the one a certified person makes
    // (the Red Seal page's "Alberta Journeypersons and Qualification Certificate holders"); for an
    // apprentice writing the exam in their final period the page names no fee, so a total leaves it out
    // unless the person applies that way.
    id: "fee-ab-red-seal-application",
    label: "Applying to write the Red Seal exam in Alberta after you're certified (an Interprovincial Red Seal Application)",
    place: "CA-AB",
    amountCents: 150_00,
    onlyIf: "You apply to write the Red Seal exam after you're certified, through an Interprovincial Red Seal Application.",
    citation: checkedOn(BLANKS_CHECKED_ON, PAGES.applyOnline, "Red Seal Application | $150", "Programs for Experienced Workers"),
  },

  // ---- Alberta: registering a business ----------------------------------------------------------------
  {
    // $0, and the page says so in words ("no cost"), so its quote holds no amount (docs/engines/fees.md).
    id: "fee-ab-business-number",
    label: "Getting a business number through Alberta's Common Business Number program",
    place: "CA-AB",
    amountCents: 0,
    citation: checked(PAGES.commonBusinessNumber, "There is no cost to obtain a business number."),
  },
];
