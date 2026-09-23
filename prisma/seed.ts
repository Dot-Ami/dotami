import { PrismaClient } from "@prisma/client";

import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { addTypedStatement, listTypedStatements } from "@/lib/person/statements";
import { linkVentures } from "@/lib/db/ventures";

import { DEMO_LINK, DEMO_STATEMENT, demoScenarios } from "./seed-data";

/**
 * `npm run seed` — loads the invented ventures in `seed-data.ts` so a fresh clone shows the
 * map, the cards and the citations without anyone typing through the intake first.
 *
 * It writes through the same functions the app's own routes use, so the rows can never drift
 * from the schema, and every write is an upsert keyed on the scenario id: run it twice and
 * you still have two ventures, not four.
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    const ids = new Map<string, string>();
    for (const scenario of demoScenarios) {
      const { ventureId } = await ensureVentureFromScenario(prisma, scenario);
      ids.set(scenario.id, ventureId);
      console.log(`  ${scenario.profile.name} (${scenario.profile.province})`);
    }

    const from = ids.get(DEMO_LINK.fromId);
    const to = ids.get(DEMO_LINK.toId);
    if (from && to) {
      await linkVentures(prisma, from, to, DEMO_LINK.kind, DEMO_LINK.note);
      console.log(`  linked: ${DEMO_LINK.kind} — ${DEMO_LINK.note}`);
    }

    // A person's statements are append-only on purpose — nothing edits or removes them. So the
    // seed checks before it writes; otherwise running it twice would say the same thing twice.
    const existing = await listTypedStatements(prisma);
    if (existing.some((s) => s.text === DEMO_STATEMENT.text)) {
      console.log(`  statement already on record (${DEMO_STATEMENT.saidAt}) — left alone`);
    } else {
      await addTypedStatement(prisma, { text: DEMO_STATEMENT.text, saidAt: DEMO_STATEMENT.saidAt });
      console.log(`  one dated statement (${DEMO_STATEMENT.saidAt})`);
    }

    const who = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";
    console.log(`\nSeeded ${demoScenarios.length} invented ventures for ${who}.`);
    console.log("They are made up. Delete them from /ventures when you want a clean slate.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nSeeding failed. Is the database running and migrated?");
  console.error("  docker start dotami-pg   # or your own Postgres");
  console.error("  npm run prisma:deploy");
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
