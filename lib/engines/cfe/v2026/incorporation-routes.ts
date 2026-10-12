import type { CFECitation, CFERoute } from "./types";

/**
 * The ways to incorporate, side by side on the Incorporating stage (2026-10-11; design:
 * docs/architecture/future-cockpit.md § 9, fix 2). Showing only the federal route would choose it for
 * the person, so every route a province has written is listed next to it with the same kinds of rows,
 * and DotAmi picks none.
 *
 * Every line rests on words read on that route's own page on the day in its citation. A fee is shown
 * only when the page states the amount, and the amount is inside the quoted words
 * (tests/incorporation-routes.spec.ts checks). Alberta's registry fees sit in the "Registry agent
 * product catalogue", which no tool could open on 2026-10-11 (it answers with a bot check), so they
 * are named blanks until a person reads them there. Never fill one in from a search snippet.
 */

const READ = "2026-10-11";

const ISED_FEES: CFECitation = {
  title: "Corporations Canada: Services, fees and processing times",
  authority: "federal",
  jurisdiction: "CA",
  url: "https://ised-isde.canada.ca/site/corporations-canada/en/services-fees-and-processing-times",
  lastVerified: READ,
  note: "Online fees for incorporating a business corporation and filing its annual return (date modified 2025-05-06). The page adds: \"All processing times mentioned are business days or hours.\"",
};

const ISED_PROVINCES: CFECitation = {
  title: "Corporations Canada: Register a federal corporation in a province or territory",
  authority: "federal",
  jurisdiction: "CA",
  url: "https://ised-isde.canada.ca/site/corporations-canada/en/register-federal-corporation-province-or-territory",
  lastVerified: READ,
  note: "A federal corporation registers in each province or territory where it does business (date modified 2022-06-26). Alberta is one of the partner provinces the page lists.",
};

const AB_INCORPORATE: CFECitation = {
  title: "Alberta: Incorporate an Alberta corporation",
  authority: "provincial",
  jurisdiction: "AB",
  url: "https://www.alberta.ca/incorporate-alberta-corporation",
  lastVerified: READ,
  note: "Steps and costs to incorporate in Alberta. The amounts are in the Registry agent product catalogue it links to, which was not read. No date modified is shown.",
};

const AB_REGISTRY: CFECitation = {
  title: "Alberta: Find a business registry",
  authority: "provincial",
  jurisdiction: "AB",
  url: "https://www.alberta.ca/find-business-registry",
  lastVerified: READ,
  note: "Registry agents charge their own service fee. No date modified is shown.",
};

const AB_ANNUAL_RETURNS: CFECitation = {
  title: "Alberta: Annual returns for corporations, cooperatives and organizations",
  authority: "provincial",
  jurisdiction: "AB",
  url: "https://www.alberta.ca/corporations-cooperatives-organizations-annual-returns",
  lastVerified: READ,
  note: "An Alberta corporation files an annual return through a registry service provider. No date modified is shown.",
};

export const incorporationRoutesV2026: readonly CFERoute[] = [
  {
    id: "incorporation-route-federal",
    nodeId: "stage-3a-incorporation-80k-net",
    jurisdiction: "CA",
    label: "Federal (Corporations Canada)",
    summary: "A corporation under federal law, filed online with Corporations Canada.",
    lines: [
      {
        id: "federal-incorporation-fee",
        label: "Government fee to incorporate online",
        kind: "official-fee",
        amountCad: 200,
        per: "once",
        quotes: ["It will cost $200 and will take 1 day."],
        citation: ISED_FEES,
      },
      {
        id: "federal-express-fee",
        label: "Express service, if you want it",
        kind: "official-fee",
        amountCad: 100,
        per: "once",
        quotes: ["Add $100 for express service in 4 hours."],
        citation: ISED_FEES,
      },
      {
        id: "federal-name-report",
        label: "Name search report",
        kind: "not-needed",
        quotes: [
          "You don't need to order a Nuans report before incorporating online with a word name.",
          "The corporate name search is now part of the federal incorporation process.",
        ],
        citation: ISED_FEES,
      },
      {
        id: "federal-annual-return-fee",
        label: "Annual return, filed online",
        kind: "official-fee",
        amountCad: 12,
        per: "year",
        quotes: ["It will cost $12 and will take 1 day."],
        citation: ISED_FEES,
      },
      {
        id: "federal-provincial-registration",
        label: "Registering in each province where it does business",
        kind: "named-blank",
        quotes: [
          "Provincial and territorial legislation requires you to register your federal corporation in each province and territory in which it will conduct business.",
          "Most provinces and territories charge for registering a corporation.",
        ],
        citation: ISED_PROVINCES,
      },
    ],
  },
  {
    id: "incorporation-route-alberta",
    nodeId: "stage-3a-incorporation-80k-net",
    jurisdiction: "AB",
    label: "Alberta (Corporate Registry)",
    summary: "A corporation under Alberta law, filed through a registry agent.",
    blanksNote:
      "Alberta's amounts are in the Registry agent product catalogue, which DotAmi hasn't read yet, so none is shown.",
    lines: [
      {
        id: "alberta-incorporation-government-fee",
        label: "Government fee to incorporate",
        kind: "named-blank",
        per: "once",
        quotes: ["The service provider that processes your application will charge a government fee and a service fee."],
        citation: AB_INCORPORATE,
      },
      {
        id: "alberta-incorporation-service-fee",
        label: "Registry agent's service fee",
        kind: "named-blank",
        per: "once",
        quotes: ["Service fees are not regulated and may vary from one agent to another."],
        citation: AB_REGISTRY,
      },
      {
        id: "alberta-nuans-report",
        label: "Alberta NUANS name report, unless you take a number name",
        kind: "named-blank",
        per: "once",
        quotes: ["You do not need a NUANS report when the proposed name will be a 'number name' assigned by Corporate Registry"],
        citation: AB_INCORPORATE,
      },
      {
        id: "alberta-annual-return-fees",
        label: "Annual return: government fee and service fee",
        kind: "named-blank",
        per: "year",
        quotes: [
          "You must submit an annual return to an authorized Corporate Registry service provider.",
          "Service providers will charge a government fee and a service fee for filing annual returns",
        ],
        citation: AB_ANNUAL_RETURNS,
      },
    ],
  },
];

/**
 * The routes to show on a stage for an idea in `province` (a province code, e.g. "AB"): the federal
 * route and the province's own, in that order. When the province has none written yet,
 * `provinceNotWritten` names it so the screen can say so, instead of the federal route looking like
 * the only way.
 */
export function incorporationRoutesFor(
  nodeId: string,
  province: string,
): { routes: CFERoute[]; provinceNotWritten: string | null } {
  const forNode = incorporationRoutesV2026.filter((route) => route.nodeId === nodeId);
  if (forNode.length === 0) return { routes: [], provinceNotWritten: null };
  const routes = forNode.filter((route) => route.jurisdiction === "CA" || route.jurisdiction === province);
  const provinceWritten = forNode.some((route) => route.jurisdiction === province);
  return { routes, provinceNotWritten: provinceWritten ? null : province };
}
