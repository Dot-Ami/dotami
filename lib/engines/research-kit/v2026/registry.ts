/**
 * The source registry: one "connector card" for every outside source the research kit imports or links in
 * phases 2 and 3 of the plan for any idea (docs/architecture/research-kit.md § 5.2). Each card says how DotAmi
 * may reach the source, what may be kept, whether its figures may be compared or added up, its licence and
 * credit line, and the words on the source's own page that decided it, with the day and who checked them.
 *
 * Plain data, no network: this folder imports nothing from outside itself (tests/research-kit-registry.spec.ts
 * checks that, and ./validate.ts checks every card). The importers read their source's licence and credit line
 * from here (scripts/lib/import-kit.mjs), and hand-kept lists elsewhere are views over it (./views.ts).
 *
 * What is not here yet, on purpose:
 * - Live look-ups on the person's own account (Google Places, Yelp, Semrush, Ahrefs, Similarweb): they come
 *   with the Lens's connector powers (task [9g], research-kit.md § 9 C), and their named-business part waits on
 *   research story S2.5.26. A card is only marked `lens-live` once that vendor's terms for agent use are read.
 * - The rent-price places of S2.5.22n (Rogers Rent-All, Protospace, ENTS): no list of them exists in the app
 *   yet, and whether their prices may be reused waits on their replies (other-ways-to-build.md call 9 A2).
 */
import type { Licence, LicenceId, SourceCard } from "./types";

/** The licences a card may name. A card naming any other is refused by the validator. */
export const LICENCES: Readonly<Record<LicenceId, Licence>> = {
  "ogl-canada-2.0": {
    id: "ogl-canada-2.0",
    name: "Open Government Licence – Canada",
    url: "https://open.canada.ca/en/open-government-licence-canada",
    open: true,
  },
  "statcan-open-licence": {
    id: "statcan-open-licence",
    name: "Statistics Canada Open Licence",
    url: "https://www.statcan.gc.ca/en/reference/licence",
    open: true,
  },
  // Not a licence to reuse anything: the site's own terms of use, for sources DotAmi only links to.
  "site-terms": {
    id: "site-terms",
    name: "The site's own terms of use",
    url: "",
    open: false,
  },
};

// ---- Words read on the licence pages, word for word (scripts/check-quotes.mjs found each on 2026-10-20) ----

/** What the Open Government Licence – Canada lets anyone do with the information. */
const OGL_GRANT =
  "Copy, modify, publish, translate, adapt, distribute or otherwise use the Information in any medium, mode or format for any lawful purpose";
/** The licence's own attribution line, for when a provider gives none of its own. */
const OGL_CREDIT = "Contains information licensed under the Open Government Licence – Canada.";
/** Its non-endorsement term. */
const OGL_NO_ENDORSEMENT =
  "This licence does not grant you any right to use the Information in a way that suggests any official status or that the Information Provider endorses you or your use of the Information";

/** What the Statistics Canada Open Licence grants. */
const STATCAN_GRANT = "worldwide, royalty-free, non-exclusive licence";
/**
 * The notice the Statistics Canada Open Licence asks of a product made from its information ("Adapted from
 * Statistics Canada, name of product, reference date." and the line after it). The import fills the product's
 * table and reference period.
 */
const statcanCredit = (product: string) =>
  `Adapted from Statistics Canada, ${product}, {period}. This does not constitute an endorsement by Statistics Canada of this product.`;
/** One of the things a user of the information must do. */
const STATCAN_NO_LINKING =
  "not merge or link the Information with any other databases for the purpose of attempting to identify an individual person, business or organization";

const CHECKED_ON = "2026-10-20";

/** A shipped government file: kept for good under its open licence, shown as published, comparable. */
const shippedUnder = (licence: "ogl-canada-2.0" | "statcan-open-licence") =>
  ({
    access: "ship",
    keyHolder: "none",
    keepLimit: [{ field: "content", limit: "forever", quote: licence === "ogl-canada-2.0" ? OGL_GRANT : STATCAN_GRANT }],
    modelUseRule: "none",
    compareAllowed: { allowed: "yes" },
    licence,
    termsUrl: LICENCES[licence].url,
    termsQuote: licence === "ogl-canada-2.0" ? OGL_GRANT : STATCAN_GRANT,
    seenOn: CHECKED_ON,
    checkedBy: "tool",
  }) as const;

/** A page DotAmi only links to, or never fetches: nothing from it is kept, shown as a figure, or read by a rule. */
const linkOnly = {
  keyHolder: "none",
  keepLimit: [{ field: "content", limit: "never", quote: null, why: "DotAmi only links to it and keeps nothing from it." }],
  display: { kind: "allowed" },
  figureKind: "none",
  feeds: [],
  modelUseRule: "none",
  compareAllowed: { allowed: "yes" },
  licence: "site-terms",
  creditLine: null,
} as const;

const OASIS_DATASET = "https://open.canada.ca/data/en/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec";
const OASIS_FILES = "https://open.canada.ca/data/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec/resource";

export const SOURCES: readonly SourceCard[] = [
  // ---- Shipped: government files a maintainer's script imports before a release ----------------------------
  {
    id: "oasis-2025",
    name: "Occupational and Skills Information System (OaSIS) - 2025 Version 1.0",
    publisher: "Employment and Social Development Canada",
    url: OASIS_DATASET,
    phase: "now",
    ...shippedUnder("ogl-canada-2.0"),
    display: { kind: "with-conditions", conditions: [OGL_NO_ENDORSEMENT] },
    figureKind: "published",
    feeds: ["shown", "search"],
    creditLine: OGL_CREDIT,
    keyedBy: ["noc"],
    files: [
      { name: "guide_oasis_2025_v4.0.csv", url: `${OASIS_FILES}/2a7a17bf-b67c-4fc2-b636-959c7f1d7ae4/download/guide_oasis_2025_v4.0.csv` },
      { name: "skills_oasis_2025_v1.1.csv", url: `${OASIS_FILES}/bd9cf3f2-4cd5-47b1-ba74-ab68cd0a941b/download/skills_oasis_2025_v1.1.csv` },
      { name: "knowledge_oasis_2025_v.1.1.csv", url: `${OASIS_FILES}/b5c3eb08-dda8-4929-ba5d-b90582db6c70/download/knowledge_oasis_2025_v.1.1.csv` },
      { name: "labels_oasis_2025_v1.1.csv", url: `${OASIS_FILES}/af53ca1d-5efc-4e52-ad42-9b858a4507c6/download/labels_oasis_2025_v1.1.csv` },
    ],
    note: "The four files scripts/import-oasis.mjs reads today: the taxonomy, the skills and knowledge ratings, and each job's name. The dataset's record says it is updated as needed; it gives no next-release date.",
  },
  {
    id: "oasis-2025-example-titles",
    name: "Occupational and Skills Information System (OaSIS) - 2025 Version 1.0: Example Titles",
    publisher: "Employment and Social Development Canada",
    url: OASIS_DATASET,
    phase: "now",
    ...shippedUnder("ogl-canada-2.0"),
    display: { kind: "with-conditions", conditions: [OGL_NO_ENDORSEMENT] },
    figureKind: "none",
    feeds: ["search"],
    creditLine: OGL_CREDIT,
    keyedBy: ["noc"],
    files: [
      {
        name: "example-titles_oasis_2025_v1.0.csv",
        url: `${OASIS_FILES}/3484364c-75a4-4e22-ae9a-d12ea72569d4/download/example-titles_oasis_2025_v1.0.csv`,
      },
    ],
    note: "The job titles people search when they pick the job closest to their work (research note 28f). Imported since 2026-10-21 by scripts/import-oasis-titles.mjs into lib/engines/oasis/v2026/titles.ts, and searched by lib/engines/oasis/v2026/title-search.ts. Keyed to the same 7-character OaSIS codes as the four files above. Its rows are of three kinds: Example, Index and Inclusion.",
  },
  {
    id: "noc-2021-elements",
    name: "National Occupational Classification (NOC) 2021 Version 1.0",
    publisher: "Statistics Canada",
    url: "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1",
    phase: "now",
    ...shippedUnder("statcan-open-licence"),
    display: { kind: "allowed" },
    figureKind: "none",
    feeds: ["search", "shown"],
    creditLine: statcanCredit("National Occupational Classification (NOC) 2021 Version 1.0"),
    keyedBy: ["noc"],
    files: [{ name: "noc-2021-v1.0-elements.csv", url: "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv" }],
    note: "The elements file: each job group's example titles, and its \"Employment requirements\", quoted word for word as the government's own words (task 28a). Imported since 2026-10-21 by scripts/import-noc.mjs into lib/engines/noc/v2021/data.ts. Its open.canada.ca record says it is made available under the Statistics Canada Open Licence, and its metadata also names the Open Government Licence – Canada; the Statistics Canada notice is the one used here. Decided 2026-10-21 (the maintainer's call 4, \"statcan\"): this file uses Statistics Canada's credit line.",
  },
  {
    id: "job-bank-wages",
    name: "Wages",
    publisher: "Employment and Social Development Canada",
    url: "https://open.canada.ca/data/en/dataset/adad580f-76b0-4502-bd05-20c125de9116",
    phase: "phase-2",
    ...shippedUnder("ogl-canada-2.0"),
    display: { kind: "with-conditions", conditions: [OGL_NO_ENDORSEMENT] },
    figureKind: "published",
    feeds: ["shown"],
    creditLine: OGL_CREDIT,
    keyedBy: ["noc", "province", "economic-region"],
    files: [
      {
        name: "2a71-das-wage2025opendata-esdc-all-19nov2025-vf.csv",
        url: "https://open.canada.ca/data/dataset/adad580f-76b0-4502-bd05-20c125de9116/resource/9da94d63-b178-4a64-aeb3-b6a3bd721ad2/download/2a71-das-wage2025opendata-esdc-all-19nov2025-vf.csv",
      },
    ],
    note: "Job Bank's wage file, by job, province and economic region (research note 25s; task 25i imports it). Each row's source code says what the row really is: a row shown under a region can be a province-wide figure or a small-area estimate. UTF-8 with a byte-order mark. No next-release date is stated; Job Bank's methodology page says wages are updated \"on an annual basis, usually in the fall\". Job Bank's own pages are never fetched (the job-bank-pages card).",
  },
  {
    id: "naics-2022",
    name: "North American Industry Classification System (NAICS) Canada 2022 Version 1.0",
    publisher: "Statistics Canada",
    url: "https://www.statcan.gc.ca/en/subjects/standard/naics/2022/v1/index",
    phase: "phase-2",
    ...shippedUnder("statcan-open-licence"),
    display: { kind: "allowed" },
    figureKind: "none",
    feeds: ["search"],
    creditLine: statcanCredit("North American Industry Classification System (NAICS) Canada 2022 Version 1.0"),
    keyedBy: ["naics"],
    files: [
      {
        name: "naics-scian-2022-structure-v1-eng.csv",
        url: "https://www.statcan.gc.ca/eng/statistical-programs/document/naics-scian-2022-structure-v1-eng.csv",
      },
    ],
    note: "The industry code list a person picks their industry from, and that roads' job links are checked against (task 25e). Its open.canada.ca record says it is made available under the Statistics Canada Open Licence.",
  },
  {
    id: "statcan-business-counts",
    name: "Canadian Business Counts, with employees, census metropolitan areas",
    publisher: "Statistics Canada",
    url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117601",
    phase: "phase-3",
    ...shippedUnder("statcan-open-licence"),
    display: { kind: "with-conditions", conditions: [STATCAN_NO_LINKING] },
    figureKind: "count",
    feeds: ["shown"],
    creditLine: statcanCredit("Canadian Business Counts, table {table}"),
    keyedBy: ["naics", "area", "province"],
    note: "Later phase: the counts of places of business for each industry and area (tasks 23f and 25d). Each June and December is a new table number (June 2026: 33-10-1176-01), so the table id and reference period are inputs to its import. As the research saw it (not confirmed; 23f checks), the area table stops at 4-digit industry groups and counts only businesses with employees. Statistics Canada states no next-release date on the table.",
  },
  {
    id: "statcan-census-98-10-0594",
    name: "Census of Population 2021, table 98-10-0594-01 (occupation by industry)",
    publisher: "Statistics Canada",
    url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810059401",
    phase: "phase-3",
    ...shippedUnder("statcan-open-licence"),
    display: { kind: "with-conditions", conditions: [STATCAN_NO_LINKING] },
    figureKind: "count",
    // Read by the people who review a job's industry candidates (job links), never by a screen or a rule.
    feeds: [],
    creditLine: statcanCredit("Census of Population 2021, table {table}"),
    keyedBy: ["noc", "naics"],
    note: "Later phase: the nearest official link from jobs to industries, at 4-digit occupation by 2-digit sector, as the research reported it (not confirmed; research-kit.md § 13 item 4). Used to cite the job-links catalog, not shown.",
  },

  // ---- The ad libraries: links the person opens in their own browser; nothing in DotAmi fetches either --------
  {
    id: "meta-ad-library",
    name: "Meta's Ad Library",
    publisher: "Meta",
    url: "https://www.facebook.com/ads/library/",
    phase: "now",
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["business-name"],
    termsUrl: "https://www.facebook.com/apps/site_scraping_tos_terms.php",
    termsQuote: "Meta's express written permission",
    seenOn: "2026-10-15",
    checkedBy: "model",
    neverFetch: ["https://www.facebook.com", "https://facebook.com", "https://m.facebook.com"],
    lists: ["ad-libraries"],
    note: "Automated collection needs Meta's express written permission (competitive-landscape.md § 4.6). The terms page was read through a summarising tool on 2026-10-15; it needs scripts to show its text, so scripts/check-quotes.mjs couldn't find the words on 2026-10-20. A person should read it.",
  },
  {
    id: "google-ads-transparency-center",
    name: "Google's Ads Transparency Center",
    publisher: "Google",
    url: "https://adstransparency.google.com/",
    phase: "now",
    // On the never-fetch list because its terms couldn't be read, not because words were found that bar scripts:
    // the maintainer's call 5, 2026-10-21 ("never-fetch"). The person still opens it through the link.
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["business-name"],
    termsUrl: "https://adstransparency.google.com/terms",
    termsQuote: null,
    seenOn: "2026-10-15",
    checkedBy: "not-read",
    neverFetch: ["https://adstransparency.google.com"],
    lists: ["ad-libraries"],
    note: "Its own terms page loads only with scripts and wasn't readable by our tools (competitive-landscape.md § 4.6), and Google's general terms restrict automated access. The maintainer's call 5, 2026-10-21: on the never-fetch list now, since its terms couldn't be read; DotAmi still links to it and reads nothing from it.",
  },

  // ---- Never automated: their terms bar scripts, so nothing in DotAmi fetches them -------------------------
  {
    id: "job-bank-pages",
    name: "Job Bank",
    publisher: "Employment and Social Development Canada",
    url: "https://www.jobbank.gc.ca/",
    phase: "now",
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["noc"],
    termsUrl: "https://www.jobbank.gc.ca/termsofuseseeker",
    termsQuote: "any script, robot, spider, Web crawler, screen scraper",
    seenOn: CHECKED_ON,
    checkedBy: "tool",
    neverFetch: ["https://www.jobbank.gc.ca", "https://jobbank.gc.ca", "https://www.guichetemplois.gc.ca"],
    note: "Job Bank's pages. Its open-data files on open.canada.ca are shipped instead (the job-bank-wages card); a link to its general search page never carries the person's job.",
  },
  {
    id: "yellowpages-ca",
    name: "YellowPages.ca",
    publisher: "Yellow Pages",
    url: "https://www.yellowpages.ca/",
    phase: "now",
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["business-name"],
    termsUrl: "https://corporate.yp.ca/terms-of-use-agreement",
    termsQuote: "framing, scraping, data-mining, extraction or collection",
    seenOn: CHECKED_ON,
    checkedBy: "tool",
    neverFetch: ["https://www.yellowpages.ca", "https://yellowpages.ca"],
  },
  {
    id: "canada411",
    name: "Canada411",
    publisher: "Yellow Pages",
    url: "https://www.canada411.ca/",
    phase: "now",
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["business-name"],
    termsUrl: "https://corporate.yp.ca/terms-of-use-agreement",
    termsQuote: "framing, scraping, data-mining, extraction or collection",
    seenOn: CHECKED_ON,
    checkedBy: "tool",
    neverFetch: ["https://www.canada411.ca", "https://canada411.ca"],
    note: "Canada411 links to the same terms as YellowPages.ca (competitive-landscape.md § 4.4, seen 2026-10-15); the words were found on that page.",
  },
  {
    id: "google-maps-consumer",
    name: "Google Maps",
    publisher: "Google",
    url: "https://www.google.com/maps",
    phase: "now",
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["business-name", "area"],
    termsUrl: "https://www.google.com/help/terms_maps/",
    termsQuote: "business listings database, mailing list, or telemarketing list",
    seenOn: CHECKED_ON,
    checkedBy: "tool",
    neverFetch: ["https://www.google.com/maps", "https://www.google.ca/maps", "https://maps.google.com", "https://maps.google.ca", "https://maps.app.goo.gl"],
    note: "Google Maps' consumer site. Google's Places API on the person's own account is a different source, not entered yet (a later live look-up).",
  },
  {
    id: "dozr",
    name: "DOZR",
    publisher: "DOZR",
    url: "https://dozr.com/",
    phase: "now",
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["asset-type"],
    termsUrl: "https://i.dozr.com/terms",
    termsQuote: "any collection and use of any product listings, descriptions, or prices",
    seenOn: CHECKED_ON,
    checkedBy: "tool",
    neverFetch: ["https://dozr.com", "https://www.dozr.com", "https://i.dozr.com"],
    note: "An equipment-rental marketplace (other-ways-to-build.md § 4.10).",
  },
  {
    id: "kijiji",
    name: "Kijiji",
    publisher: "Kijiji",
    url: "https://www.kijiji.ca/",
    phase: "now",
    access: "never-automated",
    ...linkOnly,
    keyedBy: ["asset-type"],
    termsUrl: "https://community.kijiji.ca/t/kijiji-terms-of-use/29",
    termsQuote: "use any robot, spider, scraper or other automated means to access Kijiji and collect content for any purpose without our express written permission",
    seenOn: CHECKED_ON,
    checkedBy: "tool",
    neverFetch: ["https://www.kijiji.ca", "https://kijiji.ca", "https://community.kijiji.ca"],
    note: "Its terms were only reported by a reviewer on 2026-10-15 (other-ways-to-build.md [S42]); the words were found on the page on 2026-10-20.",
  },
];
