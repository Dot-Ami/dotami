import { phaseChangesV2026, phaseLegalFormsV2026, phaseStandingsV2026 } from "./catalog";
import type { PhaseCatalog } from "./types";

export type {
  PhaseCatalog,
  PhaseChange,
  PhaseChangeGroup,
  PhaseFormAnswer,
  PhaseLegalForm,
  PhaseLegalFormId,
  PhaseLink,
  PhaseLinkHeldBack,
  PhaseSource,
  PhaseStanding,
  PhaseStandingId,
} from "./types";
export { PHASE_LINKS_HELD_BACK, phaseChangesV2026, phaseLegalFormsV2026, phaseStandingsV2026 } from "./catalog";
export { PHASE_SOURCE_HOSTS, phaseCatalogProblems } from "./validate";

/**
 * The phase catalog (task 48c; docs/engines/phases.md): where a business stands, its legal form, and what it can go
 * through. Read by nothing on screen yet; lib/engines/all-citations.ts lists its sources for the quote check.
 */
export const phasesCatalogV2026: PhaseCatalog = {
  version: "v2026",
  standings: phaseStandingsV2026,
  legalForms: phaseLegalFormsV2026,
  changes: phaseChangesV2026,
};
