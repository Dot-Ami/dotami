import type { CitationAuthority, Province } from "../../shared/types";
import type { PhaseChange, PhaseLegalForm, PhaseLinkHeldBack, PhaseSource, PhaseStanding } from "./types";

/**
 * The phases a business can go through (task 48c, story S2.5.48; docs/engines/phases.md): where it stands, its legal
 * form, and the 33 changes the official pages name, in six groups. Written from the test list the maintainer read
 * against the CRA's "Maintain your business" page on 2026-11-12 (task 48a's test data, read in task 48b): the same ids,
 * names, groups, forms, starting points and pages, and tests/phase-catalog.spec.ts holds the two together.
 *
 * Every source is a tool check (option B, docs/engines/citations.md): `node scripts/check-quotes.mjs` found each quote
 * below, word for word, on its live page on CHECKED_ON. Three pages were also read in full by the maintainer on
 * 2026-10-25 (`HIS_READ`), so their citations record that read and their cards say "Read by a person"; no other page
 * here has a read date. Every "leads to" carries the page that says so and the words it says it in. Where the quoted words
 * sit in a fold that is shut when the page opens, the source names the fold (`fold`), so a person who opens the page
 * knows what to click.
 *
 * Not here yet, on purpose: the facts each change needs and the papers it names (the plan's § 2). Each is asked or
 * named on a step, with the step's own page, when a change's steps are written (tasks 48g and 48k).
 *
 * No screen reads this catalog yet (tests/phase-catalog.spec.ts checks that only the citations list names it).
 */

/** The day scripts/check-quotes.mjs found every quote below on its page. */
const CHECKED_ON = "2026-11-12";

interface Page {
  title: string;
  authority: CitationAuthority;
  jurisdiction: Province;
  url: string;
  note: string;
  /** Only on a page a person is on record as having read in full. */
  read?: { lastVerified: string; readBy: "person" };
}

/**
 * The maintainer read these pages in full on 2026-10-25 (docs/engines/citations.md, § The maintainer's reads of
 * 2026-10-25): every citation of them records that read, and keeps its tool check (rule 5). tests/maintainer-reads.spec.ts
 * holds every catalog to his list.
 */
const HIS_READ = { lastVerified: "2026-10-25", readBy: "person" } as const;

const MB = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/maintain-business";
const SETUP = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business";
const GST = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses";
const CC = "https://ised-isde.canada.ca/site/corporations-canada/en/business-corporations/";
const AB = "https://www.alberta.ca/";

const cra = (title: string, url: string, note: string): Page => ({ title, authority: "CRA", jurisdiction: "CA", url, note });
const federal = (title: string, url: string, note: string): Page => ({ title, authority: "federal", jurisdiction: "CA", url, note });
const alberta = (title: string, url: string, note: string): Page => ({ title, authority: "provincial", jurisdiction: "AB", url, note });

// Each page once. The title is the page's own name, as the maintainer read it in the list; the note says what DotAmi
// cites it for.
const PAGES = {
  hub: cra("Maintain your business (CRA)", `${MB}.html`, "The CRA's list of the changes a business tells it about."),
  setup: { ...cra("Setting up your business (CRA)", `${SETUP}.html`, "The CRA's three business structures."), read: HIS_READ },
  soleProp: { ...cra("Sole proprietorship (CRA)", `${SETUP}/sole-proprietorship.html`, "What a business in your own name is."), read: HIS_READ },
  partnership: cra("Partnership (CRA)", `${SETUP}/partnership.html`, "What a partnership is."),
  corporation: { ...cra("Corporation (CRA)", `${SETUP}/corporation.html`, "What a corporation is."), read: HIS_READ },
  statcan: federal(
    "Monthly Business Openings and Closures (MBOC) (Statistics Canada)",
    "https://www23.statcan.gc.ca/imdb/p2SV.pl?Function=getSurvey&SDDS=5401",
    "How Statistics Canada counts businesses as continuing, closed for a time, or gone.",
  ),
  address: cra("Change of business address (CRA)", `${MB}/change-address.html`, "Telling the CRA of a new business address."),
  nextSteps: federal(
    "Next steps following the incorporation of your business (Corporations Canada)",
    `${CC}next-steps-following-incorporation-your-business`,
    "What a federal corporation files after it is formed: address and director changes, and its annual return.",
  ),
  operatingName: cra("Change a business operating name (CRA)", `${MB}/change-operating-name.html`, "Telling the CRA of a new operating name."),
  abForms: alberta(
    "Corporate Registry forms for businesses (Alberta)",
    `${AB}business-organization-forms`,
    "Alberta's registry forms for starting, changing, ending or reviving a business. The forms themselves are files and are not cited.",
  ),
  owners: cra(
    "Change of owners, partners, or directors (CRA)",
    `${MB}/change-owner-partners-directors.html`,
    "What a change of owners, partners or directors means at the CRA, for each legal form.",
  ),
  abChangeNotices: alberta(
    "Change notices for corporations, cooperatives and organizations (Alberta)",
    `${AB}corporations-cooperatives-organizations-change-notices`,
    "Telling Alberta's registry of a change of directors or address.",
  ),
  fiscalYearEnd: cra("Change of fiscal year-end (CRA)", `${MB}/change-fiscal-year-end.html`, "Changing the fiscal year-end."),
  activity: cra("Change of business activity (CRA)", `${MB}/change-business-activity.html`, "Telling the CRA of a new business activity."),
  legalStatus: cra(
    "Change of legal status (CRA)",
    `${MB}/change-legal-status.html`,
    "A change in the number of owners, or in whether the business is incorporated.",
  ),
  buying: cra("Buying a business (CRA)", `${MB}/buying-business.html`, "Buying a business's assets, or its shares."),
  amalgamation: cra("Amalgamation (corporations) (CRA)", `${MB}/amalgamation.html`, "Corporations that combine into one."),
  ccAmalgamating: federal(
    "Guide on amalgamating business corporations (Corporations Canada)",
    `${CC}guide-amalgamating-business-corporations`,
    "How federal corporations amalgamate.",
  ),
  abAmend: alberta(
    "Amend notices for corporations, cooperatives and non-profits (Alberta)",
    `${AB}amend-notices-for-a-corporation-cooperative-or-non-profit`,
    "Amalgamating, or continuing out of Alberta, through Alberta's registry.",
  ),
  ccStructure: federal(
    "Changing the structure or nature of the business corporation (Corporations Canada)",
    `${CC}changing-structure-or-nature-business-corporation`,
    "A federal corporation that moves under another law, or comes under the federal one.",
  ),
  locations: cra(
    "Opening more locations, branches, or divisions (CRA)",
    `${MB}/opening-locations-branches-divisions.html`,
    "Keeping the accounts of more locations, branches or divisions apart.",
  ),
  assets: cra(
    "Bringing personal assets into your business (CRA)",
    `${MB}/bringing-personal-assets-into-your-business.html`,
    "Moving your own property into the business, by legal form.",
  ),
  abOutOfProvince: alberta(
    "Register an out-of-province corporation (Alberta)",
    `${AB}register-out-of-province-corporation`,
    "A corporation from elsewhere doing business in Alberta, or an Alberta one in BC, Manitoba or Saskatchewan.",
  ),
  pausing: cra("Temporarily stopping business operations (CRA)", `${MB}/temporarily-stop.html`, "What still has to be filed while a business is stopped."),
  selling: cra("Selling a business (CRA)", `${MB}/selling-business.html`, "What a seller closes or cancels at the CRA."),
  closing: cra("Closing CRA program accounts (CRA)", `${MB}/closing-accounts.html`, "Closing the CRA accounts when the business closes."),
  gstClose: cra(
    "Close your GST/HST account (CRA)",
    `${GST}/gst-hst-account/close-account.html`,
    "Closing a GST/HST account, including after a receivership, a bankruptcy or a death.",
  ),
  ccDissolving: federal(
    "Guide on dissolving a business corporation (Corporations Canada)",
    `${CC}guide-dissolving-business-corporation`,
    "How a federal corporation is dissolved.",
  ),
  abDissolve: alberta(
    "Liquidate or dissolve a corporation, cooperative or organization (Alberta)",
    `${AB}corporations-cooperatives-organizations-liquidate-dissolve`,
    "Dissolving an Alberta corporation.",
  ),
  insolvency: cra(
    "Bankruptcy/receivership (CRA)",
    `${MB}/receivership-bankruptcy.html`,
    "Bankruptcy, receivership and a proposal to creditors, as the CRA describes them.",
  ),
  osbProposals: federal(
    "You are Owed Money — Division I Proposals (Office of the Superintendent of Bankruptcy)",
    "https://ised-isde.canada.ca/site/office-superintendent-bankruptcy/en/you-are-owed-money/you-are-owed-money-division-i-proposals",
    "What a proposal to creditors is, and how it ends.",
  ),
  bankruptcyStructures: cra(
    "Bankruptcy – Business structures (CRA)",
    `${MB}/receivership-bankruptcy/bankruptcy-business-structures.html`,
    "What a bankruptcy means for each legal form.",
  ),
  retirement: cra(
    "Retirement or death of business owner or partner (CRA)",
    `${MB}/retirement-death.html`,
    "What the retirement or death of an owner means for each legal form.",
  ),
  resume: cra("Resume operations (CRA)", `${MB}/resume-operations.html`, "Re-opening the accounts of a business that stopped."),
  ccReviving: federal(
    "Policy on reviving a business corporation (Corporations Canada)",
    `${CC}policy-reviving-business-corporation`,
    "Reviving a dissolved federal corporation.",
  ),
  abRevive: alberta(
    "Revive a corporation, cooperative or organization (Alberta)",
    `${AB}revive-a-corporation-cooperative-or-organization`,
    "Reviving a dissolved Alberta corporation.",
  ),
  t2: cra(
    "Corporation income tax return (CRA)",
    "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax-return.html",
    "A corporation's yearly return, owed even with no tax to pay.",
  ),
  gstDeadlines: cra(
    "Reporting requirements and deadlines - File your GST/HST return (CRA)",
    `${GST}/file-gst-hst-return/reporting-requirements-deadlines.html`,
    "A GST/HST return for every reporting period, and what a late one can cost.",
  ),
  abAnnual: alberta(
    "Annual returns for corporations, cooperatives, and organizations (Alberta)",
    `${AB}corporations-cooperatives-organizations-annual-returns`,
    "An Alberta corporation's annual return, and what happens without it.",
  ),
  vdp: cra(
    "Who is eligible - Voluntary Disclosures Program (CRA)",
    "https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/voluntary-disclosures-program/eligible-vdp.html",
    "Who can correct past returns with the CRA through a voluntary disclosure.",
  ),
  relief: cra(
    "Cancel or waive penalties and interest at the CRA (CRA)",
    "https://www.canada.ca/en/revenue-agency/services/about-canada-revenue-agency-cra/complaints-disputes/cancel-waive-penalties-interest.html",
    "Asking the CRA to cancel or waive penalties and interest.",
  ),
} satisfies Record<string, Page>;

/** A source: the page, the words this entry leans on, and the fold they sit in when the page opens with it shut. */
function src(page: Page, quotes: readonly string[], fold?: PhaseSource["fold"]): PhaseSource {
  const { read, ...cited } = page;
  const toolCheck = { checkedOn: CHECKED_ON, quotes: [...quotes] };
  // A page he read keeps both: the read wins on screen, the tool check stays for the quote check (citations.md, rule 3).
  // Spread whole: only lib/engines/shared/citation-check.ts reads a citation's date fields by name
  // (tests/citation-check.spec.ts).
  const check = read ? { ...read, toolCheck } : { toolCheck };
  return { ...cited, ...check, ...(fold ? { fold } : {}) };
}

const P = PAGES;

// The folds quoted words sit in, shut when the page opens: found in the raw pages and confirmed in a browser on
// CHECKED_ON (the receipts are in the plan's folder, 48c). Alberta's forms page uses one label for several folds, so
// those name the heading above them too.
const AB_NAME_FOLD_TO_REGISTER = { label: "Alberta business name or partnership", under: "Incorporation or initial registration" };
const AB_NAME_FOLD_TO_END = { label: "Alberta business name or partnership", under: "Dissolve, cancel or revive" };
const IN_RECEIVERSHIP_FOLD = { label: "You are in receivership" };

// ---- Where a business stands --------------------------------------------------------------------------------------

export const phaseStandingsV2026: readonly PhaseStanding[] = [
  {
    id: "not-started",
    name: "Not started: an idea",
    citations: [src(P.setup, ["The type of structure you choose for your business has a significant effect on the way you report your income"])],
  },
  {
    id: "running",
    name: "Running",
    citations: [
      src(P.hub, ["You must notify the CRA about certain changes you make to your business"]),
      src(P.statcan, ["Continuing businesses are those that have employees in both months"]),
    ],
  },
  {
    id: "paused",
    name: "Paused",
    citations: [
      src(P.pausing, ["If you temporarily stop your business, you must continue to file GST/HST returns even if your income is zero for the period"]),
      src(P.statcan, ["A temporary business closure is the difference between closures and exits"]),
    ],
  },
  {
    id: "ended",
    name: "Ended: closed, sold or dissolved",
    citations: [
      src(P.closing, ["When you decide to close your business and no longer need your business number (BN)"]),
      src(P.ccDissolving, ["A corporation can apply to dissolve when it has no property or liabilities"]),
      src(P.statcan, ["The definition of exits is based on the Longitudinal Employment Analysis Program (LEAP) annual exits"]),
    ],
  },
];

// ---- Its legal form -------------------------------------------------------------------------------------------------

const THREE_STRUCTURES = "To find out the impact each structure would have on your business";

export const phaseLegalFormsV2026: readonly PhaseLegalForm[] = [
  {
    id: "own-name",
    name: "In your own name (a sole proprietorship)",
    inRulesToday: true,
    citations: [
      src(P.setup, [THREE_STRUCTURES]),
      src(P.soleProp, ["A sole proprietorship is an unincorporated business that is owned by one individual"]),
    ],
  },
  {
    id: "partnership",
    name: "A partnership",
    inRulesToday: false,
    citations: [
      src(P.setup, [THREE_STRUCTURES]),
      src(P.partnership, [
        "A partnership is an association or relationship between two or more individuals, corporations, trusts, or partnerships that join together to carry on a trade or business",
      ]),
    ],
  },
  {
    id: "corporation",
    name: "A corporation",
    inRulesToday: true,
    citations: [src(P.setup, [THREE_STRUCTURES]), src(P.corporation, ["A corporation is a separate legal entity"])],
  },
];

// ---- What it can go through ----------------------------------------------------------------------------------------

const ALL_YES = { "own-name": "yes", partnership: "yes", corporation: "yes" } as const;
const CORPORATION_ONLY = { "own-name": "no", partnership: "no", corporation: "yes" } as const;
const RUNNING_OR_PAUSED = ["running", "paused"] as const;

// Words quoted for more than one entry or link, written once.
const CLOSE_OLD_NUMBER = "In most cases, you have to close your existing business number (BN) and Canada Revenue Agency (CRA) accounts and register for new ones";
const CLOSE_YOUR_BUSINESS = "When you decide to close your business and no longer need your business number (BN)";
const SHAREHOLDER_CARRIES_ON = "When a shareholder retires or passes away, the corporation can continue to operate";
const TEMPORARILY_STOP = "If you temporarily stop your business, you must continue to file GST/HST returns even if your income is zero for the period";

export const phaseChangesV2026: readonly PhaseChange[] = [
  // Keeping the record straight
  {
    id: "change-address",
    planLabel: "K1",
    group: "record",
    name: "The business address changes",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [],
    roadId: null,
    citations: [
      src(P.address, ["Notify the CRA as soon as possible of changes in any of your business addresses"]),
      src(P.nextSteps, ["You must notify Corporations Canada of any change to your corporation's registered office address"]),
    ],
  },
  {
    id: "change-operating-name",
    planLabel: "K2",
    group: "record",
    name: "The name it trades under changes",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [],
    roadId: null,
    citations: [
      src(P.operatingName, ["Your operating name is the name you use in your day-to-day activities and to advertise your business"]),
      // Alberta's form for the name a business in your own name trades under. The page has no form for changing it:
      // a new name is declared on the same form.
      src(P.abForms, ["Declaration of trade name/sole proprietorship"], AB_NAME_FOLD_TO_REGISTER),
    ],
  },
  {
    id: "change-directors",
    planLabel: "K3",
    group: "record",
    name: "Directors or officers change",
    forms: CORPORATION_ONLY,
    from: RUNNING_OR_PAUSED,
    leadsTo: [],
    roadId: null,
    citations: [
      src(P.owners, ["It is important to make sure that the incorporating authority's registry and the CRA have the correct directors' names on file"]),
      src(P.nextSteps, ["you will need to file the change regarding directors"]),
      src(P.abChangeNotices, ["If your corporation is changing directors, you will need to get"]),
    ],
  },
  {
    id: "change-fiscal-year-end",
    planLabel: "K4",
    group: "record",
    name: "The fiscal year-end changes",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [],
    roadId: null,
    citations: [src(P.fiscalYearEnd, ["To change a fiscal period, write a letter to your tax services office asking for approval"])],
  },
  {
    id: "change-kind-of-work",
    planLabel: "K5",
    group: "record",
    name: "The kind of work changes",
    // The page speaks only of a self-employed person; it says nothing either way about the other two.
    forms: { "own-name": "yes", partnership: "not-said", corporation: "not-said" },
    from: RUNNING_OR_PAUSED,
    leadsTo: [],
    roadId: null,
    citations: [src(P.activity, ["Whenever you change your business activity, you have to notify your tax services office"])],
  },

  // Who owns it, or what it is
  {
    id: "change-number-of-owners",
    planLabel: "O1",
    group: "owners-or-form",
    name: "A second owner joins a business in your own name, or a partnership drops to one owner",
    forms: { "own-name": "yes", partnership: "yes", corporation: "no" },
    from: ["running"],
    leadsTo: [{ to: "change-closing-accounts", citation: src(P.legalStatus, [CLOSE_OLD_NUMBER]) }],
    roadId: null,
    citations: [
      src(P.legalStatus, ["When the number of owners in a sole proprietorship changes, your business legal status changes in one of the following ways"]),
    ],
  },
  {
    id: "change-partners",
    planLabel: "O2",
    group: "owners-or-form",
    name: "Partners change",
    forms: { "own-name": "no", partnership: "yes", corporation: "no" },
    from: ["running"],
    leadsTo: [],
    roadId: null,
    citations: [src(P.owners, ["If the structure of your partnership changes and a partner leaves or one is added, call the CRA"])],
  },
  {
    id: "change-incorporating",
    planLabel: "O3",
    group: "owners-or-form",
    name: "A running business is incorporated",
    forms: { "own-name": "yes", partnership: "yes", corporation: "result" },
    from: ["running"],
    leadsTo: [{ to: "change-closing-accounts", citation: src(P.legalStatus, [CLOSE_OLD_NUMBER]) }],
    roadId: null,
    citations: [src(P.legalStatus, ["When your business becomes incorporated", "from sole proprietorship to corporation"])],
  },
  {
    id: "change-shares-change-hands",
    planLabel: "O4",
    group: "owners-or-form",
    name: "A corporation's shares change hands",
    forms: CORPORATION_ONLY,
    from: ["running"],
    leadsTo: [{ to: "change-directors", citation: src(P.nextSteps, ["the shareholders elect the corporation's directors"]) }],
    roadId: null,
    citations: [
      src(P.buying, ["Another way of buying a business is to buy the shares of an incorporated business"]),
      src(P.owners, [
        "Before you contact the CRA, any structure or owner changes for a corporation must be updated and validated with the federal or provincial incorporating authorities",
      ]),
    ],
  },
  {
    id: "change-amalgamation",
    planLabel: "O5",
    group: "owners-or-form",
    name: "Corporations amalgamate",
    forms: CORPORATION_ONLY,
    from: ["running"],
    leadsTo: [],
    roadId: null,
    citations: [
      src(P.amalgamation, ["two or more corporations, known as predecessor corporations, combine their businesses to form a new successor corporation"]),
      src(P.ccAmalgamating, ["merge and carry on as one corporation"]),
      src(P.abAmend, ["Two or more Alberta corporations can join together (amalgamate) to become one new corporation"]),
    ],
  },
  {
    id: "change-continuance",
    planLabel: "O6",
    group: "owners-or-form",
    name: "A corporation moves under another law (federal to provincial, or the reverse)",
    forms: CORPORATION_ONLY,
    from: ["running"],
    leadsTo: [],
    roadId: null,
    citations: [
      src(P.ccStructure, [
        "A continuance (import) allows an incorporated business to effectively re-incorporate under another legislation",
        "An export transaction allows a corporation incorporated under the CBCA to be governed by legislation other than the CBCA",
      ]),
      src(P.abAmend, ["Alberta corporations may continue out of Alberta to become a corporation in another province or country"]),
    ],
  },
  {
    id: "change-business-leaves-corporation",
    planLabel: "O7",
    group: "owners-or-form",
    name: "A corporation's business carries on without the corporation",
    forms: { "own-name": "result", partnership: "result", corporation: "yes" },
    from: ["running"],
    leadsTo: [
      {
        to: "change-dissolving",
        citation: src(P.nextSteps, ["If you are no longer operating the corporation, you can dissolve your corporation"]),
      },
    ],
    roadId: null,
    citations: [src(P.legalStatus, ["When your business is no longer incorporated", "corporation to sole proprietorship"])],
  },

  // Growing
  {
    id: "change-buying-a-business",
    planLabel: "G1",
    group: "growing",
    name: "Buying a business",
    forms: ALL_YES,
    from: ["not-started", "running"],
    leadsTo: [],
    roadId: null,
    citations: [src(P.buying, ["You may need a new business number"])],
  },
  {
    id: "change-more-locations",
    planLabel: "G2",
    group: "growing",
    name: "More locations, branches or divisions",
    forms: ALL_YES,
    from: ["running"],
    leadsTo: [],
    roadId: null,
    citations: [src(P.locations, ["Special filing rules apply to divisions and branches"])],
  },
  {
    id: "change-bringing-assets-in",
    planLabel: "G3",
    group: "growing",
    name: "Bringing your own assets into the business",
    forms: ALL_YES,
    from: ["running"],
    leadsTo: [],
    roadId: null,
    citations: [src(P.assets, ["The rules differ for each type of business structure"])],
  },
  {
    id: "change-another-province",
    planLabel: "G4",
    group: "growing",
    name: "Doing business in another province",
    // Only a corporation's page was read; nothing read speaks of the other two either way.
    forms: { "own-name": "not-read", partnership: "not-read", corporation: "yes" },
    from: ["running"],
    leadsTo: [],
    roadId: null,
    citations: [
      src(P.abOutOfProvince, [
        "If your corporation was formed in another province or country, it must be registered to do business in Alberta",
        "Register your Alberta business in BC, Manitoba or Saskatchewan",
      ]),
    ],
  },

  // Stopping
  {
    id: "change-pausing",
    planLabel: "S1",
    group: "stopping",
    name: "Pausing",
    forms: ALL_YES,
    from: ["running"],
    leadsTo: [{ to: "paused", citation: src(P.pausing, [TEMPORARILY_STOP]) }],
    roadId: null,
    citations: [src(P.pausing, ["You must continue to file T2 corporate income tax returns until your corporation is dissolved"])],
  },
  {
    id: "change-selling",
    planLabel: "S2",
    group: "stopping",
    name: "Selling the business",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [{ to: "change-closing-accounts", citation: src(P.selling, ["since you might have to cancel your BN"]) }],
    roadId: null,
    citations: [
      src(P.selling, ["If the business you are selling has employees, you must close your payroll account"]),
      src(P.owners, ["A new owner can't continue using the old BN"]),
    ],
  },
  {
    id: "change-closing-accounts",
    planLabel: "S3",
    group: "stopping",
    name: "Closing the CRA accounts",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [{ to: "ended", citation: src(P.closing, [CLOSE_YOUR_BUSINESS]) }],
    roadId: null,
    citations: [
      src(P.closing, ["you have to fill in certain forms before the accounts can be closed"]),
      src(P.gstClose, ["If you decide to close your GST/HST account, you must notify the Canada Revenue Agency (CRA) and provide the reason for closing it"]),
    ],
  },
  {
    id: "change-dissolving",
    planLabel: "S4",
    group: "stopping",
    name: "Dissolving a corporation",
    forms: CORPORATION_ONLY,
    from: RUNNING_OR_PAUSED,
    leadsTo: [{ to: "ended", citation: src(P.nextSteps, ["which means that you are legally terminating its existence"]) }],
    roadId: null,
    citations: [
      src(P.ccDissolving, ["A corporation can be dissolved only when its property has been distributed and its liabilities have been discharged"]),
      src(P.abDissolve, ["You and other shareholders or directors can vote if your corporation has stopped doing business and doesn't have any debts"]),
      // The page's sentence opens "When you want to permanently dissolve your corporation, you should…"; the quote starts
      // after its advice words, which no official quote carries without its own allowance (tests/helpers/verdict-words.ts).
      src(P.closing, ["send an application for dissolution to the government body that governs the affairs of your corporation"]),
    ],
  },
  {
    id: "change-cancelling-a-name",
    planLabel: "S5",
    group: "stopping",
    name: "Cancelling a registered name or partnership",
    forms: { "own-name": "yes", partnership: "yes", corporation: "no" },
    from: RUNNING_OR_PAUSED,
    leadsTo: [{ to: "ended", citation: src(P.abForms, ["Cancellation of trade name/sole proprietorship"], AB_NAME_FOLD_TO_END) }],
    roadId: null,
    citations: [src(P.abForms, ["Cancellation of trade name/sole proprietorship", "Cancellation of general partnership"], AB_NAME_FOLD_TO_END)],
  },
  {
    id: "change-proposal",
    planLabel: "S6",
    group: "stopping",
    name: "A proposal to creditors",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [
      { to: "running", citation: src(P.osbProposals, ["restoring its financial condition with a proposal may save the business"]) },
      {
        to: "change-bankruptcy",
        citation: src(P.osbProposals, ["if the Court rejects a division I proposal, the insolvent person is deemed bankrupt"]),
      },
    ],
    roadId: null,
    citations: [
      src(P.insolvency, ["make a proposal (a payment arrangement with their creditors for a percentage of their debts value)"]),
      src(P.osbProposals, ["is essentially a compromise between a commercial debtor and his or her creditors"]),
    ],
  },
  {
    id: "change-receivership",
    planLabel: "S7",
    group: "stopping",
    name: "Receivership",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [
      {
        to: "ended",
        citation: src(P.gstClose, ["Most receiverships lead to ending the client's activities and closing the client's BN"], IN_RECEIVERSHIP_FOLD),
      },
    ],
    roadId: null,
    citations: [
      src(P.insolvency, ["they employ the services of a third party, a receiver, for the purpose of liquidating the assets"]),
      src(
        P.gstClose,
        ["use your existing GST/HST account to take control of your business by reporting the activities of the receivership"],
        IN_RECEIVERSHIP_FOLD,
      ),
    ],
  },
  {
    id: "change-bankruptcy",
    planLabel: "S8",
    group: "stopping",
    name: "Bankruptcy",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [
      {
        to: "ended",
        citation: src(P.bankruptcyStructures, [
          "In most cases, unless a bankrupt corporation pays all debts owed at the time of bankruptcy, the company ceases to exist",
        ]),
      },
      {
        to: "change-starting-again",
        citation: src(P.bankruptcyStructures, [
          "If you wish to continue in business, you will be considered a new legal entity beginning on the day after the assignment into bankruptcy",
        ]),
      },
    ],
    roadId: null,
    citations: [
      src(P.insolvency, ["A trustee in bankruptcy can be designated to liquidate the assets"]),
      src(P.bankruptcyStructures, [
        "When one individual in a partnership made up of two individuals declares bankruptcy, the partnership can no longer exist",
      ]),
      src(P.ccDissolving, ["Bankruptcy does not end a corporation's existence"]),
    ],
  },
  {
    id: "change-retiring",
    planLabel: "S9",
    group: "stopping",
    name: "The owner retires or steps away",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    // The list he read also has "Selling the business" here; no page read says so, so it is held back
    // (PHASE_LINKS_HELD_BACK below).
    leadsTo: [
      {
        to: "change-partners",
        citation: src(P.retirement, ["If a partner no longer wants to be in a partnership, go to Change of owner, partners, or directors"]),
      },
      { to: "change-shares-change-hands", citation: src(P.retirement, [SHAREHOLDER_CARRIES_ON]) },
      {
        to: "change-closing-accounts",
        citation: src(P.retirement, ["If it is determined that the partnership will cease to exist, go to Closing CRA program accounts"]),
      },
    ],
    roadId: null,
    citations: [
      src(P.retirement, [
        "Depending on your business structure, the retirement or death of an owner could have an impact on your Canada Revenue Agency (CRA) business accounts",
      ]),
    ],
  },
  {
    id: "change-death",
    planLabel: "S10",
    group: "stopping",
    name: "An owner or partner dies",
    forms: ALL_YES,
    from: RUNNING_OR_PAUSED,
    leadsTo: [
      {
        to: "change-closing-accounts",
        citation: src(P.retirement, ["It will also be necessary to close the business number (BN) and all CRA business accounts"]),
      },
      {
        to: "change-partners",
        citation: src(P.retirement, ["The status of the business account depends entirely on the type of partnership agreement that has been written"]),
      },
      { to: "change-shares-change-hands", citation: src(P.retirement, [SHAREHOLDER_CARRIES_ON]) },
    ],
    roadId: null,
    citations: [
      src(P.retirement, [
        "When the owner of a sole proprietorship passes away, a final personal income tax and benefit return has to be filed for that person",
      ]),
      src(
        P.gstClose,
        ["When the sole proprietor of the business has passed away, the individual's date of death should be provided to the CRA as soon as possible"],
        { label: "The sole proprietor of the business has passed away" },
      ),
    ],
  },

  // Coming back
  {
    id: "change-resuming",
    planLabel: "R1",
    group: "coming-back",
    name: "Resuming after a pause",
    forms: ALL_YES,
    from: ["paused"],
    leadsTo: [
      {
        to: "running",
        citation: src(P.resume, [
          "When you decide to re-open a business account and the entity has not changed, you can simply contact the Canada Revenue Agency (CRA)",
        ]),
      },
    ],
    roadId: null,
    citations: [src(P.resume, ["To re-open a payroll or GST/HST account, all you need to do is ask by calling the CRA"])],
  },
  {
    id: "change-reviving",
    planLabel: "R2",
    group: "coming-back",
    name: "Reviving a dissolved corporation",
    forms: CORPORATION_ONLY,
    from: ["ended"],
    leadsTo: [
      {
        to: "running",
        citation: src(P.ccReviving, [
          "restored to its previous legal position in the same manner and to the same extent as if it had not been dissolved",
        ]),
      },
    ],
    roadId: null,
    citations: [
      src(P.ccReviving, ["A revival allows a corporation dissolved under the CBCA to be restored to its previous legal position"]),
      src(
        P.abRevive,
        [
          "An interested person, as described below, may revive a dissolved corporation as long as an application is made within 10 years of the original date of dissolution",
        ],
        { label: "Alberta corporation" },
      ),
      src(P.resume, ["Reviving a corporation is not a change in the legal entity"]),
    ],
  },
  {
    id: "change-starting-again",
    planLabel: "R3",
    group: "coming-back",
    name: "Starting again after an end",
    forms: ALL_YES,
    from: ["ended"],
    leadsTo: [
      { to: "not-started", citation: src(P.resume, ["you will need to register for a new business number (BN) and new program accounts"]) },
    ],
    roadId: null,
    citations: [
      src(P.resume, ["If the entity has changed, the CRA considers you to be a new employer"]),
      src(P.abForms, ["Revival is not available – Register a new business name"], AB_NAME_FOLD_TO_END),
    ],
  },

  // Catching up
  {
    id: "change-late-returns",
    planLabel: "C1",
    group: "catching-up",
    name: "Tax returns late or missed",
    forms: ALL_YES,
    from: ["running", "paused", "ended"],
    leadsTo: [
      {
        to: "change-voluntary-disclosure",
        citation: src(P.vdp, ["You did not file a tax return for a previous year and it is now one year late"]),
      },
      { to: "change-relief", citation: src(P.relief, ["the CRA may grant relief of penalties and interest"]) },
    ],
    roadId: null,
    citations: [
      src(P.t2, ["return every tax year even if there is no tax payable"]),
      src(P.gstDeadlines, ["We can charge penalties and interest on returns or amounts we have not received by the due date"]),
    ],
  },
  {
    id: "change-missed-registry-returns",
    planLabel: "C2",
    group: "catching-up",
    name: "Yearly registry returns missed",
    // A partnership's own registry filings were not read.
    forms: { "own-name": "no", partnership: "not-read", corporation: "yes" },
    from: RUNNING_OR_PAUSED,
    leadsTo: [{ to: "change-dissolving", citation: src(P.abAnnual, ["If you do not file the annual return, your corporation may be dissolved"]) }],
    roadId: null,
    citations: [
      src(P.nextSteps, ["To avoid a potential administrative dissolution, you must file your annual return"]),
      src(P.abAnnual, ["If you do not file the annual return, your corporation may be dissolved"]),
    ],
  },
  {
    id: "change-voluntary-disclosure",
    planLabel: "C3",
    group: "catching-up",
    name: "A voluntary disclosure to the CRA",
    forms: ALL_YES,
    from: ["running", "paused", "ended"],
    leadsTo: [],
    roadId: null,
    citations: [src(P.vdp, ["You must meet all five conditions below to be eligible for relief"])],
  },
  {
    id: "change-relief",
    planLabel: "C4",
    group: "catching-up",
    name: "Asking for penalties or interest to be waived",
    forms: ALL_YES,
    from: ["running", "paused", "ended"],
    leadsTo: [],
    roadId: null,
    citations: [
      src(P.relief, ["When events beyond your control prevent you from meeting your tax obligations, the CRA may grant relief of penalties and interest"]),
    ],
  },
];

/**
 * The "leads to" links of the list the maintainer read (2026-11-12) that the catalog leaves out, each with why. A link
 * comes in once a page that says so is found, or on the maintainer's word.
 */
export const PHASE_LINKS_HELD_BACK: readonly PhaseLinkHeldBack[] = [
  {
    from: "change-retiring",
    to: "change-selling",
    why: "No page read says it: the CRA's retirement page and its selling page don't mention each other.",
  },
];
