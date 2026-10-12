export type EngineVersion = "v2026";

export type Province = "AB" | "BC" | "ON" | "CA";

export type CitationAuthority = "CRA" | "federal" | "provincial";

/**
 * S2.5.4f: what a statute citation has actually been checked against (S2.5.2f bridging).
 * - confirmed  — provision text read from the corpus; it says what the entry says, verbatim.
 * - supported  — provision text read; it supports the entry, with omissions the reading found
 *                and the entry text now carries.
 * - partial    — the Act delegates the operative figures (classes, rates) to Regulations that
 *                are NOT in the corpus yet; the figures rest on CRA pages only. Surfaced as a
 *                PARTIAL chip — this is a gap the UI must show, not hide.
 * A citation without `verification` is a CRA/provincial page read for meaning but never
 * cross-checked against the statute corpus.
 */
export type CitationVerificationStatus = "confirmed" | "supported" | "partial";

export interface CitationVerification {
  status: CitationVerificationStatus;
  /** Plain-English method + the gap when partial (e.g. which Regulation is missing). */
  method: string;
}

/**
 * S2.5.4i: where in the law store (the optional statute store, docs/architecture/law-store.md) the words behind this
 * citation live, so the screen can show them. `source` = a registry key; `label` = the
 * provision label the store uses ("20", "1100", "Sch. II Class 50"); `sub` = a best-effort
 * paragraph path inside it ("(1)(a)") — the store says whether the walk landed.
 */
export interface CorpusPointer {
  source: "ita" | "itr" | "cbca" | "abca";
  label: string;
  sub?: string;
}

export interface EngineCitation {
  title: string;
  authority: CitationAuthority;
  jurisdiction: Province;
  url: string;
  lastVerified: string;
  note: string;
  verification?: CitationVerification;
  /** S2.5.4i: one pointer per provision the title names; absent on CRA/provincial pages. */
  corpus?: CorpusPointer[];
}

/**
 * Words copied exactly from one official page, shown in quotation marks and never reworded
 * (2026-10-11: the GST/HST card had paraphrased the CRA's test and dropped its "(or fewer)").
 * The page must be one of the entry's own citations, and that citation's `lastVerified` is the day
 * a person read these words there.
 */
export interface OfficialWords {
  /** DotAmi's own short line before the quotes, saying whose words follow. */
  lead: string;
  passages: Array<{
    /** Forever, like every catalog id. */
    id: string;
    /** Each sentence as the page prints it, shown in order, each in its own quotation marks. */
    sentences: string[];
  }>;
  /** The page they were copied from. */
  url: string;
}

export interface LensAnnotations {
  tax: string;
  legal: string;
}

export interface EngineCatalog<TEntry> {
  version: EngineVersion;
  jurisdiction: "Canada";
  lastVerified: string;
  entries: readonly TEntry[];
}
