import type { IntakeGoalId } from "@/lib/journey/types";
import type { UnlockItem } from "./types";

/**
 * What each intake goal changes about the map. Product framing (not tax law), kept as
 * data so the preview never hardcodes venture knowledge in components. Copy carried over
 * from the signed-off intake preview cards (2026-06-11).
 */
type ProductCard = Omit<UnlockItem, "id" | "engine" | "state" | "step">;

export const GOAL_EFFECTS: Record<IntakeGoalId, ProductCard> = {
  "write-offs": {
    typeChip: "Write-off",
    title: "Business expenses move up the map",
    why: "Shown because write-offs are one of your selected goals.",
    payoff: "If this applies, DotAmi can prioritize expense, equipment, and workspace nodes earlier.",
    source: {
      label: "CRA",
      href: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses.html",
    },
    citations: [],
  },
  "scale-ccpc": {
    typeChip: "Next action",
    title: "Structure timing becomes a planning lens",
    why: "Shown because scaling toward a corporation is one of your selected goals.",
    payoff: "If this applies, the next map can compare simple start paths against incorporation timing.",
    source: {
      label: "Canada Business",
      href: "https://ised-isde.canada.ca/site/canada-business/en",
    },
    citations: [],
  },
  "replace-income": {
    typeChip: "Threshold",
    title: "Income replacement affects cash-flow paths",
    why: "Shown because replacing or reducing employment income is one of your selected goals.",
    payoff: "If this applies, paths with faster revenue and simpler compliance can rank higher.",
    source: {
      label: "CRA",
      href: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return.html",
    },
    citations: [],
  },
  "discover-now": {
    typeChip: "Grant",
    title: "Programs and credits stay visible early",
    why: "Shown because you want to see what may be available now.",
    payoff: "If this applies, DotAmi can keep grant and credit checks visible before revenue is known.",
    source: {
      label: "Canada Business",
      href: "https://ised-isde.canada.ca/site/canada-business/en/grants-and-financing",
    },
    citations: [],
  },
};

/** Refine-step product guidance (carried over from the signed-off preview copy). */
export const REFINE_EFFECTS: Record<"hire-first", ProductCard> = {
  "hire-first": {
    typeChip: "Compliance",
    title: "Hiring path adds payroll branches",
    why: "Shown because the hire-first path is enabled.",
    payoff: "If this applies, payroll, worker classification, and training-program checks can appear earlier.",
    source: {
      label: "CRA payroll",
      href: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll.html",
    },
    citations: [],
  },
};
