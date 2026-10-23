import type { PrismaClient } from "@prisma/client";

import type { PlanArgs } from "@/lib/cockpit/plan";
import { cockpitInput } from "@/lib/cockpit/view";
import { firstWordsOf, loadVentureScenarioById } from "@/lib/db/ventures";
import { oasisListForJob } from "@/lib/engines/oasis/v2026";
import { skillItemsV2026 } from "@/lib/engines/roads/v2026";
import { listFigures } from "@/lib/figures/store";
import { latestDestination } from "@/lib/person/statements";

import { readFuture } from "./future";
import { currentIncomeWanted } from "./person-figures";
import { dayOnThisComputer } from "./person";
import { listSkillMarks } from "./skill-marks";
import { listStepProgress } from "./step-progress";
import { roadForFuture, SHIPPED_ROADS_CATALOG } from "./types";

/**
 * What the plan page needs for one idea (docs/ui-spec/plan/_index.md), read from the data file: the saved
 * idea, what the cockpit keeps for it (the same reads as GET /api/futures/<id>), and its figures (the same
 * as GET /api/figures). It turns them into the cockpit's own road-evaluation input the way the cockpit
 * does (lib/cockpit/view.ts `cockpitInput`, the agreed figures only reaching the rules, no what-if), so
 * the plan reads exactly what the cockpit reads. Writes nothing. Null when DotAmi keeps no such idea.
 */
export async function readPlan(prisma: PrismaClient, ventureId: string, today: string): Promise<PlanArgs | null> {
  const scenario = await loadVentureScenarioById(prisma, ventureId);
  if (!scenario) return null;

  const [future, progress, skillMarks, income, firstWords, destination, figures] = await Promise.all([
    readFuture(prisma, ventureId),
    listStepProgress(prisma, ventureId),
    listSkillMarks(prisma),
    currentIncomeWanted(prisma),
    firstWordsOf(prisma, ventureId),
    latestDestination(prisma),
    listFigures(prisma, ventureId),
  ]);

  const road = roadForFuture(SHIPPED_ROADS_CATALOG, future.roadId);
  const job = future.job ? oasisListForJob(future.job.code) : null;
  // Only an agreed income, with the day agreed, as the cockpit's goal bar shows it.
  const incomeWanted = income && income.confirmedAt ? { amountCents: income.amountCents, agreedOn: dayOnThisComputer(new Date(income.confirmedAt)) } : null;

  return {
    ideaName: scenario.profile.name,
    input: cockpitInput({
      road,
      roadChosen: future.roadChosen,
      skillItems: skillItemsV2026,
      scenario,
      figures,
      // As the cockpit passes them: the income is shown beside the plan, never read by a rule.
      personFigures: [],
      future,
      progress,
      skillMarks,
      job,
      today,
    }),
    kept: {
      progress,
      skillMarks,
      forkPickedOn: Object.fromEntries(Object.entries(future.forkPicks).map(([id, pick]) => [id, pick.pickedOn])),
      targetMonthSetOn: future.targetMonthSetOn,
      figures,
      incomeWantedOn: incomeWanted?.agreedOn ?? null,
    },
    firstWords,
    destination: destination ? { text: destination.text, saidAt: destination.saidAt } : null,
    incomeWanted,
    roadChosenOn: future.roadChosenOn,
    jobPickedOn: future.job?.pickedOn ?? null,
    where: { area: future.area, region: future.region },
    today,
  };
}
