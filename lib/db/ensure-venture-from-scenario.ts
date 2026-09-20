import type { PrismaClient } from "@prisma/client";

import { mapVentureProfileToEnums } from "@/lib/db/scenario-to-prisma";
import type { Scenario } from "@/lib/scenarios/types";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/**
 * Finds or inserts the Postgres row for a scenario (keyed by the scenario id in `scenarioSeedKey`)
 * and its branch state. Used by /api/scenario/save.
 */
export async function ensureVentureFromScenario(
  prisma: PrismaClient,
  scenario: Scenario,
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
      activeBranches: scenario.state.activeBranches,
    },
    update: {
      activeNodeIds: scenario.state.activeNodeIds,
      completedNodeIds: scenario.state.completedNodeIds,
      ghostedNodeIds: scenario.state.ghostedNodeIds,
      activeBranches: scenario.state.activeBranches,
    },
  });

  return { ventureId: venture.id };
}
