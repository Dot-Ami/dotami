import type { PrismaClient, VentureLinkKind as DbLinkKind } from "@prisma/client";

import { mapVentureRowToScenario } from "@/lib/db/prisma-venture-to-scenario";
import { mapStage, reverseStage } from "@/lib/db/scenario-to-prisma";
import type { Scenario, VentureStage } from "@/lib/scenarios/types";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/** S2.5.4i — how two ideas relate. Mirrors Prisma `VentureLinkKind`. */
export type VentureLinkKind = "sister" | "overlaps" | "feeds" | "related";
export const VENTURE_LINK_KINDS: readonly VentureLinkKind[] = ["sister", "overlaps", "feeds", "related"];
export const VENTURE_LINK_LABELS: Record<VentureLinkKind, string> = {
  sister: "Sister company",
  overlaps: "Overlaps with",
  feeds: "Feeds into",
  related: "Related to",
};
const KIND_TO_DB: Record<VentureLinkKind, DbLinkKind> = {
  sister: "SISTER",
  overlaps: "OVERLAPS",
  feeds: "FEEDS",
  related: "RELATED",
};
const KIND_FROM_DB: Record<DbLinkKind, VentureLinkKind> = {
  SISTER: "sister",
  OVERLAPS: "overlaps",
  FEEDS: "feeds",
  RELATED: "related",
};

export interface VentureLinkSummary {
  id: string;
  /** The other venture in the pair, from this venture's point of view. */
  otherId: string;
  otherName: string;
  kind: VentureLinkKind;
  note: string;
  /** True when this venture is the `from` side (the side that wrote the link). */
  outbound: boolean;
}

/** One row of the ideas list — everything the /ventures page shows. Facts only; no score. */
export interface VentureSummary {
  id: string;
  /** The scenario id the cockpit uses (`Venture.scenarioSeedKey`). Null on rows saved before S2.5.4a. */
  scenarioId: string | null;
  name: string;
  type: string;
  province: string;
  stage: VentureStage;
  notes: string;
  activityTags: string[];
  structure: string;
  structureSource: string;
  targetRevenueY1: number;
  targetRevenueY3: number;
  updatedAt: string;
  createdAt: string;
  links: VentureLinkSummary[];
}

/** Every idea the person has saved, newest touched first, with its cross-references. */
export async function listVentures(prisma: PrismaClient): Promise<VentureSummary[]> {
  const user = await prisma.user.findUnique({ where: { email: STUB_EMAIL } });
  if (!user) return [];

  const rows = await prisma.venture.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      linksFrom: { include: { to: { select: { id: true, name: true } } } },
      linksTo: { include: { from: { select: { id: true, name: true } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    scenarioId: row.scenarioSeedKey,
    name: row.name,
    type: row.type.toLowerCase().replace("_", "-"),
    province: row.province,
    stage: reverseStage(row.stage),
    notes: row.notes,
    activityTags: row.activityTags,
    structure: row.structure,
    structureSource: row.structureSource,
    targetRevenueY1: row.targetRevenueY1,
    targetRevenueY3: row.targetRevenueY3,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    links: [
      ...row.linksFrom.map((l) => ({
        id: l.id,
        otherId: l.to.id,
        otherName: l.to.name,
        kind: KIND_FROM_DB[l.kind],
        note: l.note,
        outbound: true,
      })),
      ...row.linksTo.map((l) => ({
        id: l.id,
        otherId: l.from.id,
        otherName: l.from.name,
        kind: KIND_FROM_DB[l.kind],
        note: l.note,
        outbound: false,
      })),
    ],
  }));
}

/** The cockpit's `?venture=<id>` loader: one venture by its row id, as a Scenario. */
export async function loadVentureScenarioById(prisma: PrismaClient, ventureId: string): Promise<Scenario | null> {
  const row = await prisma.venture.findUnique({
    where: { id: ventureId },
    include: { scenarioState: true },
  });
  if (!row) return null;
  return mapVentureRowToScenario(row);
}

export interface VentureUpdate {
  stage?: VentureStage;
  notes?: string;
  name?: string;
}

/** Stage / notes / name edits from the ideas page. Nothing else is editable there — the map is. */
export async function updateVenture(prisma: PrismaClient, ventureId: string, patch: VentureUpdate) {
  return prisma.venture.update({
    where: { id: ventureId },
    data: {
      ...(patch.stage !== undefined ? { stage: mapStage(patch.stage) } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
    },
  });
}

/** Cross-reference two ideas. One row per pair; re-linking the same pair updates kind + note. */
export async function linkVentures(
  prisma: PrismaClient,
  fromId: string,
  toId: string,
  kind: VentureLinkKind,
  note: string,
) {
  if (fromId === toId) throw new Error("an idea cannot link to itself");
  return prisma.ventureLink.upsert({
    where: { fromId_toId: { fromId, toId } },
    create: { fromId, toId, kind: KIND_TO_DB[kind], note },
    update: { kind: KIND_TO_DB[kind], note },
  });
}

export async function unlinkVentures(prisma: PrismaClient, linkId: string) {
  return prisma.ventureLink.delete({ where: { id: linkId } });
}
