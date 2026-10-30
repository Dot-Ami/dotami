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

/**
 * A tool check (decided 2026-10-11, docs/engines/citations.md): a script fetched the live page and
 * found every quote on it, as whole words (scripts/check-quotes.mjs). It says the words are there;
 * it doesn't say anyone read the page for meaning.
 */
export interface ToolCheck {
  /** The day the script found every quote on the page, YYYY-MM-DD. Never after today. */
  checkedOn: string;
  /** The exact words the entry relies on, copied from the page. One or more, each at least three words. */
  quotes: readonly string[];
}

/**
 * Who did a read, when that is on record. Absent means nobody recorded it: most citations written
 * before 2026-10-11 were read in build sessions without saying whether a person or an AI model did
 * the reading, so they never claim a person.
 */
export type ReadBy = "person" | "model";

/**
 * How a source was checked: a read, a tool check, or both, never neither. The union makes a
 * citation with neither a type error; tests/engine-integrity.spec.ts checks the catalogs again at
 * run time. Read it through lib/engines/shared/citation-check.ts, never directly on a screen.
 */
export type CitationCheck =
  | {
      /** The day the source was last read in full, YYYY-MM-DD. Never after today. */
      lastVerified: string;
      /** Who did that read, only when it is on record (a person, or an AI model). */
      readBy?: ReadBy;
      toolCheck?: ToolCheck;
    }
  | { lastVerified?: undefined; readBy?: undefined; toolCheck: ToolCheck };

export type EngineCitation = {
  title: string;
  authority: CitationAuthority;
  jurisdiction: Province;
  url: string;
  note: string;
  verification?: CitationVerification;
  /**
   * S2.5.4i: one pointer per provision the entry relies on; the title may name fewer (the s.67.3 source since
   * 2026-10-29, whose title names its page's one section and whose pointers are four). Absent on CRA/provincial pages.
   */
  corpus?: CorpusPointer[];
  /**
   * One plain-English line saying what the page holds, drawn under the title (components/shared/citation-links.tsx)
   * so a reader knows what to look for on it (the maintainer's note of 2026-10-28). DotAmi's own words, so it is
   * always a sentence from a words file (lib/engines/shared/words.ts `sourceWords.pageHolds`), never typed here; set
   * only where that file has one, today the s.67.3 source of the Motor vehicle expenses write-off.
   */
  pageHolds?: string;
} & CitationCheck;

/**
 * Words copied exactly from one official page, shown in quotation marks and never reworded
 * (2026-10-11: the GST/HST card had paraphrased the CRA's test and dropped its "(or fewer)").
 * The page must be one of the entry's own citations, and that citation's check covers these words:
 * since 2026-10-12 a tool check (`toolCheck`, option B, docs/engines/citations.md) whose quotes are the
 * words found on the page, never a read date that claims a person read them.
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
