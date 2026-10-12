/**
 * [8i] Something in every table of DotAmi's data file, written through the app's own code, each with a
 * marker where the person's words go, so a test can check that every table's data survives a step (the
 * first-start encryption, an update, a backup) and find the words in a file's bytes or prove they aren't
 * there. tests/database-encrypt.spec.ts checks the list covers every table in lib/privacy/inventory.ts.
 */
import type { PrismaClient } from "@prisma/client";

import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { agreeToPersonFigures, proposeIncomeWanted } from "@/lib/futures/person-figures";
import { chooseRoad } from "@/lib/futures/future";
import { markSkill } from "@/lib/futures/skill-marks";
import { setStepProgress } from "@/lib/futures/step-progress";
import { addDestination, addTypedStatement } from "@/lib/person/statements";
import { writeSetting } from "@/lib/settings/store";
import { demoScenarios } from "../../prisma/seed-data";
import { inventedRoad, inventedSkillItems } from "./invented-road";

/**
 * Two ideas, a link between them, statements (a destination among them), a setting, a bank account, a
 * figure, expenses with a refund and a receipt row, a skill mark, progress on a step and the income the
 * person wants.
 */
export async function seedEveryTable(prisma: PrismaClient, marker: string) {
  const a = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
  const b = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;
  await prisma.venture.update({ where: { id: a }, data: { notes: `note ${marker}` } });
  await prisma.ventureLink.create({ data: { fromId: a, toId: b, kind: "RELATED", note: `link ${marker}` } });
  await addTypedStatement(prisma, { text: `statement ${marker}`, saidAt: "2026-09-01" });
  await addDestination(prisma, { text: `destination ${marker}`, saidAt: "2026-09-01" });
  // The shipped skill list is empty until the first written future, so the mark is on a skill of the person's own.
  await markSkill(prisma, { ownLabel: `skill ${marker}`, mark: "learning" });
  // Road 0's step statuses are the map's (kept in ScenarioState), so the progress row is on the invented test road.
  const catalog = { roads: [inventedRoad()], skillItems: inventedSkillItems };
  await chooseRoad(prisma, a, "road-invented-test-only", catalog);
  await setStepProgress(prisma, a, { roadId: "road-invented-test-only", stepId: "step-invented-train", status: "done" }, catalog);
  const [income] = await proposeIncomeWanted(prisma, { amountCents: 7_000_000 });
  await agreeToPersonFigures(prisma, [income.id]);
  await writeSetting(prisma, "figure-reminders", { cadences: ["yearly"], ideaIds: [a] });
  await prisma.sourceAccount.create({ data: { name: `Chequing ${marker}`, allowance: "always", agreedAt: new Date("2026-09-01T00:00:00Z") } });
  await prisma.figure.create({
    data: {
      ventureId: a,
      kind: "gross-revenue",
      periodStart: new Date("2026-08-01T00:00:00Z"),
      periodEnd: new Date("2026-08-31T00:00:00Z"),
      amountCents: BigInt(123_456),
      sourceKind: "file",
      sourceLabel: `sales ${marker}.xlsx`,
      status: "confirmed",
      confirmedAt: new Date("2026-09-02T10:11:12.345Z"),
    },
  });
  const bought = await prisma.expense.create({
    data: {
      ventureId: b,
      date: new Date("2026-08-15T00:00:00Z"),
      amountCents: BigInt(4_599),
      gstHstCents: BigInt(599),
      paidTo: `seller ${marker}`,
      whatFor: "printer paper",
      sourceKind: "typed",
      sourceLabel: "typed by you",
      status: "agreed",
      agreedAt: new Date("2026-08-16T00:00:00Z"),
      businessSharePercent: 60,
    },
  });
  await prisma.expense.create({
    data: {
      ventureId: b,
      date: new Date("2026-08-20T00:00:00Z"),
      amountCents: BigInt(-1_000),
      paidTo: `seller ${marker}`,
      whatFor: "refund of part of the paper",
      recordKind: "refund",
      refundOfId: bought.id,
      sourceKind: "typed",
      sourceLabel: "typed by you",
      status: "agreed",
      agreedAt: new Date("2026-08-21T00:00:00Z"),
    },
  });
  await prisma.receipt.create({
    data: { id: "0123456789abcdef0123456789abcdef", expenseId: bought.id, type: "image/png", bytes: 1234, sha256: "a".repeat(64) },
  });
  return { a, b };
}

/** How many rows each table holds, by Prisma model name. */
export async function countEveryTable(prisma: PrismaClient, models: readonly string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const model of models) {
    const delegate = (prisma as unknown as Record<string, { count(): Promise<number> }>)[model[0].toLowerCase() + model.slice(1)];
    out[model] = await delegate.count();
  }
  return out;
}
