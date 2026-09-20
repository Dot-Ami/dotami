export type { WriteOffCategory } from "./types";
export { writeOffCategoriesV2026 } from "./categories";
export type { WriteOffCategoryId } from "./categories";

import { writeOffCategoriesV2026 } from "./categories";

export const writeOffsCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-06-08",
  entries: writeOffCategoriesV2026,
} as const;
