import type { PrismaClient } from "@prisma/client";

import { mapVentureProfileToEnums } from "@/lib/db/scenario-to-prisma";
import { writeMapAnswers } from "@/lib/db/scenario-state-json";
import type { FirstSave } from "@/lib/journey/first-save";
import type { Scenario } from "@/lib/scenarios/types";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/**
 * Finds or inserts the database row for a scenario (keyed by the scenario id in `scenarioSeedKey`)
 * and its branch state. Used by /api/scenario/save.
 *
 * `firstSave` (the sentence typed on the front door, the goal picks; from Pick a future, the road and the
 * business / career / both answer) is written only when this call creates the idea: the sentence as one dated statement linked to it, the goals on it. A save of an
 * idea that already exists ignores it, so nothing the person deleted is ever written back.
 */
export async function ensureVentureFromScenario(
  prisma: PrismaClient,
  scenario: Scenario,
  firstSave: FirstSave = {},
): Promise<{ ventureId: string }> {
  const user = await prisma.user.upsert({
    where: { email: STUB_EMAIL },
    create: {
      email: STUB_EMAIL,
      name: "Stub user",
    },
    update: {},
  });

  const { type, province, employmentStatus, stage } = mapVentureProfileToEnums(scenario.profile);

  // Whether this save creates the idea decides whether the first-save extras are kept.
  const existed = (await prisma.venture.count({ where: { scenarioSeedKey: scenario.id } })) > 0;

  const venture = await prisma.venture.upsert({
    where: { scenarioSeedKey: scenario.id },
    create: {
      scenarioSeedKey: scenario.id,
      userId: user.id,
      name: scenario.profile.name,
      type,
      province,
      targetRevenueY1: scenario.profile.targetRevenueY1,
      targetRevenueY3: scenario.profile.targetRevenueY3,
      structure: scenario.profile.structure,
      // Labeled examples carry no structureSource — their structure is part of the example.
      structureSource: scenario.profile.structureSource ?? "user",
      hireFirst: scenario.profile.hireFirst,
      activityTags: scenario.profile.activityTags ?? [],
      capitalPurchasePlanned: scenario.profile.capitalPurchasePlanned ?? false,
      employmentStatus,
      stage,
      // The goal picks are written on creation only: `update` below never touches them.
      goals: firstSave.goals ?? [],
      // So are Pick a future's road and the business / career / both answer, each with its moment
      // (2026-10-12): a later save of the map never moves either.
      ...(firstSave.roadId ? { roadId: firstSave.roadId, roadChosenAt: new Date() } : {}),
      ...(firstSave.lookingFor ? { lookingFor: firstSave.lookingFor, lookingForSetAt: new Date() } : {}),
    },
    update: {
      name: scenario.profile.name,
      type,
      province,
      targetRevenueY1: scenario.profile.targetRevenueY1,
      targetRevenueY3: scenario.profile.targetRevenueY3,
      structure: scenario.profile.structure,
      // Labeled examples carry no structureSource — their structure is part of the example.
      structureSource: scenario.profile.structureSource ?? "user",
      hireFirst: scenario.profile.hireFirst,
      activityTags: scenario.profile.activityTags ?? [],
      capitalPurchasePlanned: scenario.profile.capitalPurchasePlanned ?? false,
      employmentStatus,
      stage,
    },
  });

  await prisma.scenarioState.upsert({
    where: { ventureId: venture.id },
    create: {
      ventureId: venture.id,
      activeNodeIds: scenario.state.activeNodeIds,
      completedNodeIds: scenario.state.completedNodeIds,
      ghostedNodeIds: scenario.state.ghostedNodeIds,
      // The picks and the person's own incorporation number, in one JSON column (scenario-state-json.ts).
      activeBranches: writeMapAnswers(scenario.state),
    },
    update: {
      activeNodeIds: scenario.state.activeNodeIds,
      completedNodeIds: scenario.state.completedNodeIds,
      ghostedNodeIds: scenario.state.ghostedNodeIds,
      // The picks and the person's own incorporation number, in one JSON column (scenario-state-json.ts).
      activeBranches: writeMapAnswers(scenario.state),
    },
  });

  if (!existed && firstSave.firstWords) {
    // One of the person's statements, word for word, dated the day they typed it, tied to this idea.
    await prisma.personStatement.create({
      data: {
        userId: user.id,
        ventureId: venture.id,
        text: firstSave.firstWords.text,
        saidAt: new Date(`${firstSave.firstWords.saidAt}T00:00:00Z`),
      },
    });
  }

  return { ventureId: venture.id };
}
