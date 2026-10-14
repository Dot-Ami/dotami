import type { FigureView } from "@/lib/figures/types";
import type { FutureView } from "@/lib/futures/future";
import type { SkillMarkView } from "@/lib/futures/skill-marks";
import type { StepProgressView } from "@/lib/futures/step-progress";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * An invented example future (docs/architecture/future-cockpit.md § 13 and its appendix): everything the
 * cockpit reads for a saved idea, written as data in its own file instead of read from the data file, so
 * the cockpit can draw it read-only through the same components and the same road evaluation.
 *
 * Not a catalog and not the database: an example holds an invented person's answers, and the catalogs'
 * own facts (steps, fees, skills, sources) stay in the catalogs, named here only by id.
 */
export interface ExampleFuture {
  /** The example's permanent id, as its address says it: /example/<id>. */
  id: string;
  /** The invented person's first name, as the banner and the page's title say it. */
  person: string;
  /** The idea, as Pick a future would have saved it. */
  scenario: Scenario;
  /** What GET /api/futures/<id> would answer for it (the cockpit's `KeptForIdea`, the same shape). */
  kept: {
    future: FutureView;
    progress: StepProgressView[];
    skillMarks: SkillMarkView[];
    incomeWanted: { amountCents: number; agreedOn: string } | null;
    firstWords: { text: string; saidAt: string } | null;
    destination: { text: string; saidAt: string } | null;
  };
  /** Its agreed numbers, as the figures list would give them. */
  figures: FigureView[];
  /** A what-if the example opens with (never kept, as everywhere), or null. */
  whatIfFirstYearSalesDollars: number | null;
}
