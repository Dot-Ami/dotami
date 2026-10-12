import type { EngineCitation, ToolCheck } from "../../shared/types";

/**
 * Where the government's skills list comes from, its licence, and how each was checked
 * (docs/architecture/future-cockpit.md § 6, "Skills, and the government's list for your pick of job, as
 * built"; CONTRIBUTING.md, "the government's skills list for a job"). Small and separate from ./data.ts,
 * so the words file can carry the licence's line without loading 900 jobs.
 *
 * Every check here is a tool check (option B, docs/engines/citations.md): `node scripts/check-quotes.mjs`
 * found each quote word for word on the live page on CHECKED_ON. No person is recorded as having read
 * these pages, so none carries a read date.
 */

/** The day scripts/check-quotes.mjs found every quote below on its page. */
const CHECKED_ON = "2026-10-12";

/** The dataset's version, as its page and the profile pages name it. */
export const OASIS_VERSION = "OaSIS 2025 Version 1.0";

/** The dataset's page on open.canada.ca: every item on a job's list cites it. */
export const OASIS_DATASET_URL = "https://open.canada.ca/data/en/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec";

/** The licence's page, linked wherever the list is shown (the licence asks for a link "where possible"). */
export const OASIS_LICENCE_URL = "https://open.canada.ca/en/open-government-licence-canada";

/**
 * The attribution line the licence specifies when the provider gives none, word for word. It goes with
 * the data everywhere: the top of ./data.ts, ./LICENCE.txt (and so the third-party notices), and the
 * screen under the list.
 */
export const OASIS_ATTRIBUTION = "Contains information licensed under the Open Government Licence – Canada.";

/** What the tool found on the dataset's page: its name, publisher, licence, dates and the files the import reads. */
export const OASIS_DATASET_CHECK: ToolCheck = {
  checkedOn: CHECKED_ON,
  quotes: [
    "Occupational and Skills Information System (OaSIS) - 2025 Version 1.0",
    "Publisher - Current Organization Name: Employment and Social Development Canada",
    "Licence: Open Government Licence - Canada",
    "Date Published: 2025-10-30",
    "Record Modified: 2026-10-04",
    "skills_oasis_2025_v1.1.csv Skills 2025",
    "knowledge_oasis_2025_v.1.1.csv Knowledges 2025",
    "labels_oasis_2025_v1.1.csv Labels 2025",
    "guide_oasis_2025_v4.0.csv OaSIS Taxonomy 2025",
  ],
};

/** The file each family's ratings came from. */
export const OASIS_FAMILY_FILES = {
  skills: "skills_oasis_2025_v1.1.csv",
  knowledge: "knowledge_oasis_2025_v.1.1.csv",
} as const;

/** The dataset's citation for one family's list for one job: the page, the file, the job's code. */
export function oasisDatasetCitation(family: keyof typeof OASIS_FAMILY_FILES, jobCode: string): EngineCitation {
  return {
    title: `${OASIS_VERSION} (Employment and Social Development Canada), ${family === "skills" ? "Skills" : "Knowledges"} file`,
    authority: "federal",
    jurisdiction: "CA",
    url: OASIS_DATASET_URL,
    toolCheck: OASIS_DATASET_CHECK,
    note: `From ${OASIS_FAMILY_FILES[family]}, the row for job ${jobCode}: every item the government rates 1 or more for this job, shown by name only and in the dataset's own order. Record modified 2026-10-04. The list describes people employed in the job, not owners, and is shown only because you picked this job.`,
  };
}

/**
 * Why a 0 rating is left out: the government's own profile page prints it as "0 – Not applicable"
 * (checked on the Cabinetmakers profile, 72311.00). Not shown on any screen; kept so the quote checker
 * checks it again with every other source.
 */
export const OASIS_NOT_APPLICABLE_CITATION: EngineCitation = {
  title: "OaSIS profile 72311.00, Cabinetmakers (Employment and Social Development Canada)",
  authority: "federal",
  jurisdiction: "CA",
  url: "https://noc.esdc.gc.ca/OaSIS/OaSISOccProfile?code=72311.00&version=2025.0",
  toolCheck: {
    checkedOn: CHECKED_ON,
    quotes: ["0 – Not applicable", "Cabinetmakers use a variety of woods and laminates", "OaSIS 2025 Version 1.0"],
  },
  note: "The government's profile page for one job, in OaSIS 2025 Version 1.0. It prints a rating of 0 as \"0 – Not applicable\", which is why the import leaves 0 out of a job's list.",
};

/** The licence's own page: the attribution line, the link it asks for, and that nothing may suggest endorsement. */
export const OASIS_LICENCE_CITATION: EngineCitation = {
  title: "Open Government Licence – Canada",
  authority: "federal",
  jurisdiction: "CA",
  url: OASIS_LICENCE_URL,
  toolCheck: {
    checkedOn: CHECKED_ON,
    quotes: [
      OASIS_ATTRIBUTION,
      "Acknowledge the source of the Information by including any attribution statement specified by the Information Provider(s) and, where possible, provide a link to this licence.",
      "This licence does not grant you any right to use the Information in a way that suggests any official status or that the Information Provider endorses you or your use of the Information.",
    ],
  },
  note: "Version 2.0. The data is shown with the attribution line and a link to this page, and nothing in DotAmi suggests the government endorses it or anyone's use of the list.",
};
