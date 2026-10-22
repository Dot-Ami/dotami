/**
 * What *About this job* shows (docs/ui-spec/cockpit/about-this-job.md; task 25h), as the server hands it to the
 * cockpit: plain data read from the government's files, nothing worked out about the person. Built by
 * ./view.ts on the server, which reads the 2 MB NOC and wage modules there so neither reaches the browser;
 * drawn by components/cockpit/about-this-job-panel.tsx through ./text.ts. This file imports nothing, so the
 * browser can use the types without pulling a data module in.
 */

/** One entry of the group's "Employment requirements", in the file's order. */
export type RuleEntry =
  /** A line of the government's text, word for word (its ends trimmed). */
  | { kind: "line"; text: string }
  /** A line the file gives as a sub-heading within the group (*Hairstylists*, *Barbers* in 63210). */
  | { kind: "subheading"; text: string };

/**
 * The level a wage row's own source code gives it (research 25s § 2), never its region's name: `SAE … ER` a
 * small-area estimate for a region, `ER` an economic region, `PR` a province or territory as a whole, `CAN`
 * Canada; a code with none of them names no level; `N/A`, a row the government published no figures for.
 */
export type WageRowLevel = "economic-region" | "small-area" | "province" | "canada" | "not-stated" | "not-published";

/** One row of Job Bank's wage file, as the panel shows it. Every field is the file's own, word for word. */
export interface WageRowView {
  /** The job group, five digits ("72311"). */
  noc: string;
  /** Where the row sits in the file: its code ("ER4830") and its name as a screen draws it ("Calgary"). */
  geography: { code: string; name: string };
  /** The `Source2025_NHQ` column ("EI 2023-24 ER NOC5"; "N/A"). */
  sourceCode: string;
  level: WageRowLevel;
  /** The province or territory the row belongs to, by name ("Alberta"), for a `PR` row's label. */
  provinceName: string;
  basis: "hourly" | "annual";
  /** The file's text for each figure ("19.23"), or null where it leaves the figure empty. */
  low: string | null;
  median: string | null;
  high: string | null;
  /** The `Reference_Period` column ("2023-2024"). */
  period: string;
  /** The `Data_Source_E` column ("Labour Force Survey"); "" or "NA" where the file gives none. */
  method: string;
  /** The `Wage_Comment_E` column, word for word; "" for none. */
  comment: string;
}

/** Why this row is the one shown: the person's region, their "I don't know", no answer, or a province with no question. */
export type WageContext =
  | { kind: "region"; region: string }
  | { kind: "dont-know" }
  | { kind: "not-picked" }
  | { kind: "outside-alberta"; place: string };

/** What the wage row shows. */
export type WageShown =
  /** The row, with its figures. `shownUnder` names the region when a province's figure sits under it. */
  | { kind: "row"; row: WageRowView; shownUnder: string | null }
  /**
   * A row the government published no figures for. `note` is its note, word for word, only when the note names
   * the level to look at instead (the province's or Canada's); null otherwise, and then only "Not published for
   * <region>." shows (the spec: no other row for a note that names none). `pointsTo` is the row the note names;
   * null where it names none, or points back at the row itself.
   */
  | { kind: "not-published"; row: WageRowView; note: string | null; pointsTo: WageShown | null }
  /** The file holds no row for the job group in the place at all. */
  | { kind: "missing"; noc: string; place: string };

/** A general page to look the job up yourself: a fixed address that carries nothing about the person or the job. */
export interface AboutJobLink {
  id: "job-bank" | "bizpal" | "tradesecrets";
  label: string;
  url: string;
  /** The source registry's card for the site (lib/engines/research-kit/v2026/registry.ts). */
  card: string;
}

export interface AboutJobView {
  /** The person's pick: the OaSIS job's code ("72311.00") and name ("Cabinetmakers"). */
  job: { code: string; label: string };
  /** Its NOC 2021 five-digit group ("72311", "Cabinetmakers"); null when the file has no such group. */
  group: { code: string; title: string } | null;
  rules: {
    entries: readonly RuleEntry[];
    /** True when the group holds more than one OaSIS job, so some lines are about the others. */
    groupHoldsOthers: boolean;
    /** The day the shipped copy of the elements file was read. */
    readOn: string;
    /** Statistics Canada's notice for the file, word for word. */
    licence: string;
    /** The classification's page, the quote's citation (a general page: it names no job). */
    sourceUrl: string;
  };
  wages: { context: WageContext; shown: WageShown; credit: string };
  /** The person's area, as they picked it; null when none is kept. Nothing reads it in this version. */
  area: string | null;
  links: {
    pages: readonly AboutJobLink[];
    /** The province's name when Tradesecrets is left out (outside Alberta); null in Alberta. */
    tradesecretsLeftOutFor: string | null;
  };
}
