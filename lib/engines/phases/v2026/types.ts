import type { EngineCitation } from "../../shared/types";

/** Where a business stands, one at a time (the plan of S2.5.48, § 1.2). */
export type PhaseStandingId = "not-started" | "running" | "paused" | "ended";

/** The three business structures the CRA lists ("Setting up your business"). */
export type PhaseLegalFormId = "own-name" | "partnership" | "corporation";

/**
 * What a change's pages say about one legal form: "yes" the pages speak of it; "no" it cannot apply (only a corporation
 * has directors); "result" the change ends in that form (incorporating ends in a corporation); "not-said" the pages name
 * no form for it; "not-read" no page read speaks of it either way.
 */
export type PhaseFormAnswer = "yes" | "no" | "result" | "not-said" | "not-read";

export type PhaseChangeGroup = "record" | "owners-or-form" | "growing" | "stopping" | "coming-back" | "catching-up";

/**
 * An official source of the phase catalog: a citation like every catalog's (docs/engines/citations.md), and, when the
 * words it quotes sit inside a fold that is shut when the page opens, that fold. A person who opens the page sees the
 * fold's label, not the words, until they click it (the maintainer's notes on his read of 2026-11-12, task 48b: "there
 * were instances where your main header wasn't there on the page that the URL takes me to").
 */
export type PhaseSource = EngineCitation & {
  fold?: {
    /** The fold's own label, as the page writes it ("Society and religious society"). */
    label: string;
    /** The heading above the fold, only when the same label is used for more than one fold on the page. */
    under?: string;
  };
};

export interface PhaseStanding {
  /** Permanent. */
  id: PhaseStandingId;
  /** In plain words. */
  name: string;
  citations: readonly PhaseSource[];
}

export interface PhaseLegalForm {
  /** Permanent. */
  id: PhaseLegalFormId;
  name: string;
  /** True where DotAmi's rules hold the form today (lib/scenarios/evaluation-profile.ts: own name or a corporation). */
  inRulesToday: boolean;
  citations: readonly PhaseSource[];
}

/** One "leads to": what a change can end in, and the page that says so, with the words it says it in. */
export interface PhaseLink {
  /** A standing or another change, by id. */
  to: PhaseStandingId | string;
  citation: PhaseSource;
}

export interface PhaseChange {
  /** Permanent: `change-` and what changes. */
  id: string;
  /** Its label in the plan (K1 to C4), for reading the two side by side. */
  planLabel: string;
  group: PhaseChangeGroup;
  /** In plain words. */
  name: string;
  /** What its pages say about each of the three legal forms. */
  forms: Readonly<Record<PhaseLegalFormId, PhaseFormAnswer>>;
  /** Where the business can stand when it starts (the maintainer read these as right on 2026-11-12). */
  from: readonly PhaseStandingId[];
  /** What it can lead to, each with its page. */
  leadsTo: readonly PhaseLink[];
  /** The road whose steps it holds, once written (task 48g); none is today. */
  roadId: string | null;
  /** The pages it is written from, each with the words it leans on. */
  citations: readonly PhaseSource[];
}

export interface PhaseCatalog {
  version: "v2026";
  standings: readonly PhaseStanding[];
  legalForms: readonly PhaseLegalForm[];
  changes: readonly PhaseChange[];
}

/** A "leads to" the maintainer read that the catalog holds back, and why. */
export interface PhaseLinkHeldBack {
  from: string;
  to: string;
  why: string;
}
