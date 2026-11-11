/**
 * The phases a business can go through once it exists as an idea, as test data (task 48a, story S2.5.48; the
 * maintainer's pick b1 A of 2026-11-11). Three lists, kept apart the way the official pages keep them:
 *
 * - STANDINGS: where a business stands, one at a time: not started, running, paused, ended.
 * - LEGAL_FORMS: the three business structures the CRA lists, and whether DotAmi's rules hold each one today.
 *   LATER_FORMS: the other kinds of organization the registries and the CRA name, kept for a later build (his note
 *   on b2: "we obviously need to make note of all of the other types for a future build later down the road").
 * - CHANGES: what a business can go through, in six groups, from the CRA's "Maintain your business" pages, the
 *   federal and Alberta corporate registries and the bankruptcy office. Each says which legal forms its pages speak
 *   of, where it can start from, what it leads to, and the pages behind it.
 *
 * And SITUATIONS: the maintainer's 12 situation values (his pick e2 A of 2026-11-09), each mapped onto the three
 * lists. They are the labels the test ideas will carry (task 47e, after his walk); nothing here labels an idea.
 *
 * How it was checked: every page below was fetched on 2026-11-11 and found to answer and to hold the words the entry
 * leans on (a script outside this repository; no file or PDF opened). That is a tool's check, not a person's read:
 * the maintainer's read of the list against the CRA's page is task 48b. `from` and `leadsTo` are the author's reading
 * of how the pages link each other; 48b checks them too.
 *
 * Nothing in the app reads this file. The catalog DotAmi's screens will read is task 48c, written from this list once
 * it has been read, with every source tool-checked the way catalog citations are (docs/engines/citations.md). No
 * entry has a road yet: DotAmi's roads are all about starting (tests/fixtures/ideas/v1.ts, `road`).
 *
 * Ids are forever, as everywhere in DotAmi: a wrong entry is fixed in place, never renumbered, and its id is never
 * given to another. tests/phase-lists.spec.ts holds the lists to these rules.
 */

/** Where a business stands. One at a time. */
export type StandingId = "not-started" | "running" | "paused" | "ended";

/** The business structures the CRA lists ("Setting up your business"). */
export type LegalFormId = "own-name" | "partnership" | "corporation";

/**
 * What a change's pages say about one legal form: "yes" the pages speak of it; "no" it cannot apply (only a
 * corporation has directors); "result" the change ends in that form (incorporating ends in a corporation); "not-said"
 * the pages name no form for it; "not-read" no page read speaks of it either way.
 */
export type FormAnswer = "yes" | "no" | "result" | "not-said" | "not-read";

export type ChangeGroup = "record" | "owners-or-form" | "growing" | "stopping" | "coming-back" | "catching-up";

/** An official page, by its own name. The address is https and is never a file. */
export interface OfficialPage {
  url: string;
  page: string;
}

export interface Standing {
  id: StandingId;
  name: string;
  sources: readonly OfficialPage[];
}

export interface LegalForm {
  id: LegalFormId;
  name: string;
  /** True where DotAmi's rules hold the form today (lib/scenarios/evaluation-profile.ts: own name or a corporation). */
  inRulesToday: boolean;
  sources: readonly OfficialPage[];
}

export interface LaterForm {
  id: string;
  name: string;
  sources: readonly OfficialPage[];
}

export interface Change {
  /** Permanent. */
  id: string;
  /** Its label in the maintainer's plan (K1 to C4), for reading the two side by side. */
  short: string;
  group: ChangeGroup;
  name: string;
  forms: Readonly<Record<LegalFormId, FormAnswer>>;
  /** The standings a business can be in when the change begins (the author's reading; 48b checks it). */
  from: readonly StandingId[];
  /** Other changes, or a standing, that the pages say this one leads to. Empty when they name none. */
  leadsTo: readonly string[];
  sources: readonly OfficialPage[];
  /** The road written for it. None yet. */
  roadId: string | null;
}

export interface Situation {
  id: string;
  /** The maintainer's own words for the value (his pick e2 A). */
  name: string;
  /** Where the business stands, the legal forms and the groups of changes the value covers; or why it is no phase. */
  maps:
    | { standings: readonly StandingId[]; forms: readonly LegalFormId[] | "any" | "not-said"; groups: readonly ChangeGroup[] }
    | { notAPhase: string };
}

const CRA = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/maintain-business";
const SETUP = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business";
const CC = "https://ised-isde.canada.ca/site/corporations-canada/en";
const AB = "https://www.alberta.ca";

/** The pages, once each, by a short name. */
const P = {
  hub: { url: `${CRA}.html`, page: "Maintain your business (CRA)" },
  address: { url: `${CRA}/change-address.html`, page: "Change of business address (CRA)" },
  operatingName: { url: `${CRA}/change-operating-name.html`, page: "Change a business operating name (CRA)" },
  owners: { url: `${CRA}/change-owner-partners-directors.html`, page: "Change of owners, partners, or directors (CRA)" },
  legalStatus: { url: `${CRA}/change-legal-status.html`, page: "Change of legal status (CRA)" },
  yearEnd: { url: `${CRA}/change-fiscal-year-end.html`, page: "Change of fiscal year-end (CRA)" },
  activity: { url: `${CRA}/change-business-activity.html`, page: "Change of business activity (CRA)" },
  buying: { url: `${CRA}/buying-business.html`, page: "Buying a business (CRA)" },
  amalgamation: { url: `${CRA}/amalgamation.html`, page: "Amalgamation (corporations) (CRA)" },
  locations: { url: `${CRA}/opening-locations-branches-divisions.html`, page: "Opening more locations, branches, or divisions (CRA)" },
  assets: { url: `${CRA}/bringing-personal-assets-into-your-business.html`, page: "Bringing personal assets into your business (CRA)" },
  pause: { url: `${CRA}/temporarily-stop.html`, page: "Temporarily stopping business operations (CRA)" },
  selling: { url: `${CRA}/selling-business.html`, page: "Selling a business (CRA)" },
  closing: { url: `${CRA}/closing-accounts.html`, page: "Closing CRA program accounts (CRA)" },
  insolvency: { url: `${CRA}/receivership-bankruptcy.html`, page: "Bankruptcy/receivership (CRA)" },
  bankruptcyForms: { url: `${CRA}/receivership-bankruptcy/bankruptcy-business-structures.html`, page: "Bankruptcy – Business structures (CRA)" },
  retireDeath: { url: `${CRA}/retirement-death.html`, page: "Retirement or death of business owner or partner (CRA)" },
  resume: { url: `${CRA}/resume-operations.html`, page: "Resume operations (CRA)" },
  closeGst: {
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/gst-hst-account/close-account.html",
    page: "Close your GST/HST account (CRA)",
  },
  t2: {
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax-return.html",
    page: "Corporation income tax return (CRA)",
  },
  disclosure: {
    url: "https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/voluntary-disclosures-program/eligible-vdp.html",
    page: "Who is eligible - Voluntary Disclosures Program (CRA)",
  },
  gstDeadlines: {
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/file-gst-hst-return/reporting-requirements-deadlines.html",
    page: "Reporting requirements and deadlines - File your GST/HST return (CRA)",
  },
  relief: {
    url: "https://www.canada.ca/en/revenue-agency/services/about-canada-revenue-agency-cra/complaints-disputes/cancel-waive-penalties-interest.html",
    page: "Cancel or waive penalties and interest at the CRA (CRA)",
  },
  setup: { url: `${SETUP}.html`, page: "Setting up your business (CRA)" },
  soleProp: { url: `${SETUP}/sole-proprietorship.html`, page: "Sole proprietorship (CRA)" },
  partnership: { url: `${SETUP}/partnership.html`, page: "Partnership (CRA)" },
  corporation: { url: `${SETUP}/corporation.html`, page: "Corporation (CRA)" },
  ccStructure: {
    url: `${CC}/business-corporations/changing-structure-or-nature-business-corporation`,
    page: "Changing the structure or nature of the business corporation (Corporations Canada)",
  },
  ccNextSteps: {
    url: `${CC}/business-corporations/next-steps-following-incorporation-your-business`,
    page: "Next steps following the incorporation of your business (Corporations Canada)",
  },
  ccAmalgamating: { url: `${CC}/business-corporations/guide-amalgamating-business-corporations`, page: "Guide on amalgamating business corporations (Corporations Canada)" },
  ccDissolving: { url: `${CC}/business-corporations/guide-dissolving-business-corporation`, page: "Guide on dissolving a business corporation (Corporations Canada)" },
  ccReviving: { url: `${CC}/business-corporations/policy-reviving-business-corporation`, page: "Policy on reviving a business corporation (Corporations Canada)" },
  ccCooperatives: { url: `${CC}/cooperatives`, page: "Cooperatives (Corporations Canada)" },
  ccNotForProfit: { url: `${CC}/not-profit-corporations`, page: "Not-for-profit corporations (Corporations Canada)" },
  divisionOne: {
    url: "https://ised-isde.canada.ca/site/office-superintendent-bankruptcy/en/you-are-owed-money/you-are-owed-money-division-i-proposals",
    page: "You are Owed Money — Division I Proposals (Office of the Superintendent of Bankruptcy)",
  },
  abRevive: { url: `${AB}/revive-a-corporation-cooperative-or-organization`, page: "Revive a corporation, cooperative or organization (Alberta)" },
  abForms: { url: `${AB}/business-organization-forms`, page: "Corporate Registry forms for businesses (Alberta)" },
  abDissolve: { url: `${AB}/corporations-cooperatives-organizations-liquidate-dissolve`, page: "Liquidate or dissolve a corporation, cooperative or organization (Alberta)" },
  abAnnual: { url: `${AB}/corporations-cooperatives-organizations-annual-returns`, page: "Annual returns for corporations, cooperatives, and organizations (Alberta)" },
  abChangeNotices: { url: `${AB}/corporations-cooperatives-organizations-change-notices`, page: "Change notices for corporations, cooperatives and organizations (Alberta)" },
  abAmend: { url: `${AB}/amend-notices-for-a-corporation-cooperative-or-non-profit`, page: "Amend notices for corporations, cooperatives and non-profits (Alberta)" },
  abOutOfProvince: { url: `${AB}/register-out-of-province-corporation`, page: "Register an out-of-province corporation (Alberta)" },
  statcan: { url: "https://www23.statcan.gc.ca/imdb/p2SV.pl?Function=getSurvey&SDDS=5401", page: "Monthly Business Openings and Closures (MBOC) (Statistics Canada)" },
} as const satisfies Record<string, OfficialPage>;

export const STANDINGS: readonly Standing[] = [
  { id: "not-started", name: "Not started: an idea", sources: [P.setup] },
  { id: "running", name: "Running", sources: [P.hub, P.statcan] },
  { id: "paused", name: "Paused", sources: [P.pause, P.statcan] },
  { id: "ended", name: "Ended: closed, sold or dissolved", sources: [P.closing, P.ccDissolving, P.statcan] },
];

export const LEGAL_FORMS: readonly LegalForm[] = [
  { id: "own-name", name: "In your own name (a sole proprietorship)", inRulesToday: true, sources: [P.setup, P.soleProp] },
  { id: "partnership", name: "A partnership", inRulesToday: false, sources: [P.setup, P.partnership] },
  { id: "corporation", name: "A corporation", inRulesToday: true, sources: [P.setup, P.corporation] },
];

export const LATER_FORMS: readonly LaterForm[] = [
  { id: "co-operative", name: "A co-operative", sources: [P.ccCooperatives, P.abRevive] },
  { id: "not-for-profit-corporation", name: "A not-for-profit corporation", sources: [P.ccNotForProfit] },
  { id: "limited-partnership", name: "A limited partnership", sources: [P.abForms] },
  { id: "limited-liability-partnership", name: "A limited liability partnership", sources: [P.abForms] },
  { id: "society", name: "A society", sources: [P.abRevive] },
  { id: "unincorporated-organization", name: "An organization that is not incorporated (an association, a group)", sources: [P.owners] },
];

const ALL: Readonly<Record<LegalFormId, FormAnswer>> = { "own-name": "yes", partnership: "yes", corporation: "yes" };
const CORPORATION_ONLY: Readonly<Record<LegalFormId, FormAnswer>> = { "own-name": "no", partnership: "no", corporation: "yes" };
const EXISTS: readonly StandingId[] = ["running", "paused"];
const ANY: readonly StandingId[] = ["running", "paused", "ended"];

export const CHANGES: readonly Change[] = [
  // Keeping the record straight: a report, with no road of its own.
  { id: "change-address", short: "K1", group: "record", name: "The business address changes", forms: ALL, from: EXISTS, leadsTo: [], sources: [P.address, P.ccNextSteps], roadId: null },
  { id: "change-operating-name", short: "K2", group: "record", name: "The name it trades under changes", forms: ALL, from: EXISTS, leadsTo: [], sources: [P.operatingName, P.abForms], roadId: null },
  { id: "change-directors", short: "K3", group: "record", name: "Directors or officers change", forms: CORPORATION_ONLY, from: EXISTS, leadsTo: [], sources: [P.owners, P.ccNextSteps, P.abChangeNotices], roadId: null },
  { id: "change-fiscal-year-end", short: "K4", group: "record", name: "The fiscal year-end changes", forms: ALL, from: EXISTS, leadsTo: [], sources: [P.yearEnd], roadId: null },
  {
    id: "change-kind-of-work",
    short: "K5",
    group: "record",
    name: "The kind of work changes",
    forms: { "own-name": "yes", partnership: "not-said", corporation: "not-said" },
    from: EXISTS,
    leadsTo: [],
    sources: [P.activity],
    roadId: null,
  },

  // Who owns it, or what it is.
  {
    id: "change-number-of-owners",
    short: "O1",
    group: "owners-or-form",
    name: "A second owner joins a business in your own name, or a partnership drops to one owner",
    forms: { "own-name": "yes", partnership: "yes", corporation: "no" },
    from: ["running"],
    leadsTo: ["change-closing-accounts"],
    sources: [P.legalStatus],
    roadId: null,
  },
  {
    id: "change-partners",
    short: "O2",
    group: "owners-or-form",
    name: "Partners change",
    forms: { "own-name": "no", partnership: "yes", corporation: "no" },
    from: ["running"],
    leadsTo: [],
    sources: [P.owners],
    roadId: null,
  },
  {
    id: "change-incorporating",
    short: "O3",
    group: "owners-or-form",
    name: "A running business is incorporated",
    forms: { "own-name": "yes", partnership: "yes", corporation: "result" },
    from: ["running"],
    leadsTo: ["change-closing-accounts"],
    sources: [P.legalStatus],
    roadId: null,
  },
  { id: "change-shares-change-hands", short: "O4", group: "owners-or-form", name: "A corporation's shares change hands", forms: CORPORATION_ONLY, from: ["running"], leadsTo: ["change-directors"], sources: [P.buying, P.owners], roadId: null },
  { id: "change-amalgamation", short: "O5", group: "owners-or-form", name: "Corporations amalgamate", forms: CORPORATION_ONLY, from: ["running"], leadsTo: [], sources: [P.amalgamation, P.ccAmalgamating, P.abAmend], roadId: null },
  {
    id: "change-continuance",
    short: "O6",
    group: "owners-or-form",
    name: "A corporation moves under another law (federal to provincial, or the reverse)",
    forms: CORPORATION_ONLY,
    from: ["running"],
    leadsTo: [],
    sources: [P.ccStructure, P.abAmend],
    roadId: null,
  },
  {
    id: "change-business-leaves-corporation",
    short: "O7",
    group: "owners-or-form",
    name: "A corporation's business carries on without the corporation",
    forms: { "own-name": "result", partnership: "result", corporation: "yes" },
    from: ["running"],
    leadsTo: ["change-dissolving"],
    sources: [P.legalStatus],
    roadId: null,
  },

  // Growing. Hiring a first employee and registering for GST/HST are growth too; both are on today's starting roads.
  { id: "change-buying-a-business", short: "G1", group: "growing", name: "Buying a business", forms: ALL, from: ["not-started", "running"], leadsTo: [], sources: [P.buying], roadId: null },
  { id: "change-more-locations", short: "G2", group: "growing", name: "More locations, branches or divisions", forms: ALL, from: ["running"], leadsTo: [], sources: [P.locations], roadId: null },
  { id: "change-bringing-assets-in", short: "G3", group: "growing", name: "Bringing your own assets into the business", forms: ALL, from: ["running"], leadsTo: [], sources: [P.assets], roadId: null },
  {
    id: "change-another-province",
    short: "G4",
    group: "growing",
    name: "Doing business in another province",
    forms: { "own-name": "not-read", partnership: "not-read", corporation: "yes" },
    from: ["running"],
    leadsTo: [],
    sources: [P.abOutOfProvince],
    roadId: null,
  },

  // Stopping.
  { id: "change-pausing", short: "S1", group: "stopping", name: "Pausing", forms: ALL, from: ["running"], leadsTo: ["paused"], sources: [P.pause], roadId: null },
  { id: "change-selling", short: "S2", group: "stopping", name: "Selling the business", forms: ALL, from: EXISTS, leadsTo: ["change-closing-accounts"], sources: [P.selling, P.owners], roadId: null },
  { id: "change-closing-accounts", short: "S3", group: "stopping", name: "Closing the CRA accounts", forms: ALL, from: EXISTS, leadsTo: ["ended"], sources: [P.closing, P.closeGst], roadId: null },
  { id: "change-dissolving", short: "S4", group: "stopping", name: "Dissolving a corporation", forms: CORPORATION_ONLY, from: EXISTS, leadsTo: ["ended"], sources: [P.ccDissolving, P.abDissolve, P.closing], roadId: null },
  {
    id: "change-cancelling-a-name",
    short: "S5",
    group: "stopping",
    name: "Cancelling a registered name or partnership",
    forms: { "own-name": "yes", partnership: "yes", corporation: "no" },
    from: EXISTS,
    leadsTo: ["ended"],
    sources: [P.abForms],
    roadId: null,
  },
  { id: "change-proposal", short: "S6", group: "stopping", name: "A proposal to creditors", forms: ALL, from: EXISTS, leadsTo: ["running", "change-bankruptcy"], sources: [P.insolvency, P.divisionOne], roadId: null },
  { id: "change-receivership", short: "S7", group: "stopping", name: "Receivership", forms: ALL, from: EXISTS, leadsTo: ["ended"], sources: [P.insolvency, P.closeGst], roadId: null },
  { id: "change-bankruptcy", short: "S8", group: "stopping", name: "Bankruptcy", forms: ALL, from: EXISTS, leadsTo: ["ended", "change-starting-again"], sources: [P.insolvency, P.bankruptcyForms, P.ccDissolving], roadId: null },
  {
    id: "change-retiring",
    short: "S9",
    group: "stopping",
    name: "The owner retires or steps away",
    forms: ALL,
    from: EXISTS,
    leadsTo: ["change-selling", "change-partners", "change-shares-change-hands", "change-closing-accounts"],
    sources: [P.retireDeath],
    roadId: null,
  },
  {
    id: "change-death",
    short: "S10",
    group: "stopping",
    name: "An owner or partner dies",
    forms: ALL,
    from: EXISTS,
    leadsTo: ["change-closing-accounts", "change-partners", "change-shares-change-hands"],
    sources: [P.retireDeath, P.closeGst],
    roadId: null,
  },

  // Coming back.
  { id: "change-resuming", short: "R1", group: "coming-back", name: "Resuming after a pause", forms: ALL, from: ["paused"], leadsTo: ["running"], sources: [P.resume], roadId: null },
  { id: "change-reviving", short: "R2", group: "coming-back", name: "Reviving a dissolved corporation", forms: CORPORATION_ONLY, from: ["ended"], leadsTo: ["running"], sources: [P.ccReviving, P.abRevive, P.resume], roadId: null },
  { id: "change-starting-again", short: "R3", group: "coming-back", name: "Starting again after an end", forms: ALL, from: ["ended"], leadsTo: ["not-started"], sources: [P.resume, P.abForms], roadId: null },

  // Catching up.
  { id: "change-late-returns", short: "C1", group: "catching-up", name: "Tax returns late or missed", forms: ALL, from: ANY, leadsTo: ["change-voluntary-disclosure", "change-relief"], sources: [P.t2, P.gstDeadlines], roadId: null },
  {
    id: "change-missed-registry-returns",
    short: "C2",
    group: "catching-up",
    name: "Yearly registry returns missed",
    forms: { "own-name": "no", partnership: "not-read", corporation: "yes" },
    from: EXISTS,
    leadsTo: ["change-dissolving"],
    sources: [P.ccNextSteps, P.abAnnual],
    roadId: null,
  },
  { id: "change-voluntary-disclosure", short: "C3", group: "catching-up", name: "A voluntary disclosure to the CRA", forms: ALL, from: ANY, leadsTo: [], sources: [P.disclosure], roadId: null },
  { id: "change-relief", short: "C4", group: "catching-up", name: "Asking for penalties or interest to be waived", forms: ALL, from: ANY, leadsTo: [], sources: [P.relief], roadId: null },
];

/** The six groups, in the order the plan lists them, and how many changes each held when first written. */
export const CHANGE_GROUPS: readonly { id: ChangeGroup; name: string; firstCount: number }[] = [
  { id: "record", name: "Keeping the record straight", firstCount: 5 },
  { id: "owners-or-form", name: "Who owns it, or what it is", firstCount: 7 },
  { id: "growing", name: "Growing", firstCount: 4 },
  { id: "stopping", name: "Stopping", firstCount: 10 },
  { id: "coming-back", name: "Coming back", firstCount: 3 },
  { id: "catching-up", name: "Catching up", firstCount: 4 },
];

/** The maintainer's 12 situation values (his pick e2 A of 2026-11-09), mapped onto the three lists. */
export const SITUATIONS: readonly Situation[] = [
  { id: "only-an-idea", name: "Only an idea", maps: { standings: ["not-started"], forms: "not-said", groups: [] } },
  { id: "side-business", name: "A side business", maps: { standings: ["running"], forms: ["own-name"], groups: [] } },
  { id: "running-in-own-name", name: "Running in your own name", maps: { standings: ["running"], forms: ["own-name"], groups: [] } },
  { id: "incorporated", name: "Incorporated", maps: { standings: ["running"], forms: ["corporation"], groups: [] } },
  { id: "several-companies", name: "Several companies", maps: { standings: ["running"], forms: ["corporation"], groups: [] } },
  { id: "a-job-not-a-business", name: "A job, not a business", maps: { notAPhase: "No business: the career road (task 28e)." } },
  { id: "changing-owners-or-form", name: "Changing owners or legal form", maps: { standings: ["running"], forms: "any", groups: ["owners-or-form"] } },
  { id: "growing", name: "Growing (buying a business, more locations)", maps: { standings: ["running"], forms: "any", groups: ["growing"] } },
  {
    id: "stopping",
    name: "Stopping (pausing, selling, closing, bankruptcy, retirement or death)",
    maps: { standings: ["running", "paused"], forms: "any", groups: ["stopping"] },
  },
  { id: "resuming", name: "Resuming", maps: { standings: ["paused", "ended"], forms: "any", groups: ["coming-back"] } },
  { id: "behind-on-filings", name: "Behind on filings", maps: { standings: ["running", "paused", "ended"], forms: "any", groups: ["catching-up"] } },
  { id: "outside-canada", name: "Outside Canada", maps: { notAPhase: "A value of place, not a phase." } },
];
