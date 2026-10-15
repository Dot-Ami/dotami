import type { EngineCitation } from "../../shared/types";
import type { RoadStep } from "./types";

/**
 * "Keep your records from day one" (2026-10-14): one step on every business road, written once here so
 * the two roads can't drift apart. Each road calls `keepRecordsStep` with its own permanent ids, since a
 * person's ticks and status are kept against them (docs/engines/roads.md, rule 3), and its own `next`.
 *
 * Why a step of its own: a business must keep its records from the start, and someone who learns that
 * late can't rebuild them. Road 0 already has two record lines on other steps (Sole Prop activation's
 * daily income and expenses, the bank account's statements); this step is the whole of it in one place:
 * who has to, what counts, how they must be kept, where and for how long.
 *
 * Where it sits, and so how road evaluation colours it, is each road's call, made with its `next` arrows
 * (no rule code reads this step): on road 0 it is in the first column with the other "before you open"
 * steps, so it is on the path for every idea; on the apprentice road it follows "Open your own shop", so
 * it is on the path once the person picks that side of the fork, and off it if they stay employed.
 *
 * Every source is a tool check, not a read (option B, docs/engines/citations.md): each quote was found
 * word for word on the CRA's live Keeping records pages by `node scripts/check-quotes.mjs --url …
 * --quote …` on CHECKED_ON. Nobody is recorded as having read these pages, so none has a read date.
 */

/** The day scripts/check-quotes.mjs found every quote below on its page. */
const CHECKED_ON = "2026-10-14";

const RECORDS = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records";

const PAGES = {
  whatAndWho: {
    title: "What are records, who has to keep them, and why it is important (CRA)",
    url: `${RECORDS}/what-records-who-keep-them.html`,
    note: "What counts as a record, who has to keep records by law, and what incomplete records cost at tax time and in an audit.",
  },
  requirements: {
    title: "Your responsibilities and the requirements associated with records the law requires you to keep (CRA)",
    url: `${RECORDS}/your-responsibilities-requirements-associated-records-law-requires-you-keep.html`,
    note: "What every record must be, and what electronic records also need, such as backup copies.",
  },
  whereAndHowLong: {
    title: "Where to keep your records, for how long and how to request the permission to destroy them early (CRA)",
    url: `${RECORDS}/where-keep-your-records-long-request-permission-destroy-them-early.html`,
    note: "Where records must be kept, the usual six-year period and its exceptions, and destroying records early only with the CRA's permission.",
  },
} as const;

/** A citation of one CRA page, checked by the tool on CHECKED_ON: the quotes are the exact words it found. */
function checked(page: (typeof PAGES)[keyof typeof PAGES], ...quotes: string[]): EngineCitation {
  return { ...page, authority: "CRA", jurisdiction: "CA", toolCheck: { checkedOn: CHECKED_ON, quotes } };
}

// Quotes used more than once, kept in one place so two citations of the same words can't drift.
const Q = {
  whoByLaw: "Here is the list of those who, by law, have to keep records:",
  carryingOnBusiness: "persons carrying on a business or engaged in commercial activity",
  sixYears:
    "Generally, you must keep all required records and supporting documents for a period of six years from the end of the last tax year they relate to.",
} as const;

/** The permanent ids one road gives the step and its four done-when lines. */
export interface KeepRecordsIds {
  step: string;
  what: string;
  everyTransaction: string;
  how: string;
  whereHowLong: string;
}

export function keepRecordsStep(ids: KeepRecordsIds, next: string[]): RoadStep {
  return {
    id: ids.step,
    label: "Keep your records from day one",
    summary:
      "By law, anyone carrying on a business keeps records of its transactions and the documents behind them, generally for six years from the end of the last tax year they relate to.",
    next,
    doneWhen: [
      {
        id: ids.what,
        text: "You keep records, which the law asks of anyone carrying on a business: the accounting and financial documents that sum up your transactions, and the documents that support them (the CRA's list includes bank deposit slips, credit card receipts, cash register slips and all correspondence that support your transactions).",
        citation: checked(
          PAGES.whatAndWho,
          Q.whoByLaw,
          Q.carryingOnBusiness,
          "Records are organized accounting and financial documents that summarize your transactions and include the documents to support these transactions.",
          "bank deposit slips",
          "credit card receipts",
          "cash register slips",
          "all correspondence that support your transactions",
        ),
      },
      {
        // The CRA's own reasons, kept as its reasons: what happens without records, not a promise of savings.
        id: ids.everyTransaction,
        text: "You record your transactions. The CRA says that if you don't, you may forget some of your expenses or input tax credits when you prepare your income tax or GST/HST returns; that if auditors can't work out your income because your records are incomplete, they use other methods to establish it; and that claims your records don't support could be disallowed.",
        citation: checked(
          PAGES.whatAndWho,
          "If you do not record your transactions, you may forget some of your expenses or ITCs when you prepare your income tax or GST/HST returns.",
          "If auditors cannot determine your income or taxable revenues because your records are incomplete, they will have to use other methods to establish your income and GST/HST net tax.",
          "In addition, if your records do not support your claims, they could be disallowed.",
        ),
      },
      {
        id: ids.how,
        text: "Your records are reliable and complete, supported by documents, and kept in English, French or both. Kept electronically, they are readable by CRA software, with backup copies stored, preferably at a site in Canada other than your business location.",
        citation: checked(
          PAGES.requirements,
          "be reliable and complete",
          "be supported by documents",
          "be kept in English, French, or a combination of these two languages",
          "For electronic records, also make sure:",
          "accessible to CRA officials and readable by CRA software",
          "you always store proper backup copies, preferably at a site in Canada other than your business location",
        ),
      },
      {
        id: ids.whereHowLong,
        text: "You keep them at your place of business or your residence in Canada (unless the CRA gives you written permission to keep them elsewhere), generally for six years from the end of the last tax year they relate to: for an individual that is the calendar year, for a corporation its fiscal period. Destroying them sooner needs the CRA's written permission first.",
        citation: checked(
          PAGES.whereAndHowLong,
          "You must keep records at your place of business or your residence in Canada, unless the Canada Revenue Agency (CRA) gives you written permission to keep them elsewhere.",
          Q.sixYears,
          "is the calendar year for individuals",
          "is the fiscal period for corporations",
          "you first must get written permission from the CRA",
        ),
      },
    ],
    needs: [],
    // Keeping records has no official fee; bookkeeping help, where a road names it, is its own line.
    costs: [],
    officialLinks: [{ label: "Keeping records (CRA)", url: `${RECORDS}.html` }],
    citations: [checked(PAGES.whatAndWho, Q.whoByLaw, Q.carryingOnBusiness), checked(PAGES.whereAndHowLong, Q.sixYears)],
  };
}
