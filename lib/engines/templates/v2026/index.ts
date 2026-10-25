export type { TemplateDocType, TemplateReference } from "./types";
export { templateReferencesV2026 } from "./references";
export type { TemplateReferenceId } from "./references";

import { templateReferencesV2026, type TemplateReferenceId } from "./references";

export const templatesCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-06-08",
  entries: templateReferencesV2026,
} as const;

/**
 * The prep-tool references drawn for one idea (second review of #207, 2026-10-24): those whose sources include a
 * federal page or one for the idea's own province, the rule every road's pages follow (`citationsForPlace`). Until
 * then Alberta's business-name page was drawn as *Provincial business name registration* for an idea in any province.
 */
export function templateIdsForPlace(place: string): TemplateReferenceId[] {
  return templateReferencesV2026
    .filter((reference) => reference.citations.some((citation) => citation.jurisdiction === "CA" || citation.jurisdiction === place))
    .map((reference) => reference.id);
}
