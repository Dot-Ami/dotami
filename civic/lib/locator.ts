import type { Locator, StatementType } from "./model";

/** Where in a source a passage sits, in words: "section 3.2", "Table 5", "01:12:05–01:12:31". */
export function locatorText(locator: Locator): string {
  switch (locator.kind) {
    case "page":
      return `page ${locator.page}`;
    case "section":
      return locator.section;
    case "table":
      return locator.row ? `${locator.table}, ${locator.row}` : locator.table;
    case "figure":
      return locator.figure;
    case "timestamp":
      return `${locator.start}–${locator.end}`;
    case "whole":
      return "whole item";
  }
}

export const STATEMENT_TYPE_LABEL: Record<StatementType, string> = {
  "factual-claim": "Factual claim",
  prediction: "Prediction",
  opinion: "Opinion",
  recommendation: "Recommendation",
  announcement: "Announcement",
  commitment: "Commitment",
  "legal-text": "Legal text",
  procedure: "Procedure",
  "record-of-decision": "Record of a decision",
};
