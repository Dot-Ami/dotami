import { LandingPage } from "@/components/discovery/landing-page";
import { hasListedExpenses, hasSavedIdea } from "@/lib/front-door/saved-idea";
import { prisma } from "@/lib/prisma";

// Read on every visit: Your futures and Open cockpit are offered only once an idea is saved; Your expenses
// only while none is and the Expenses page has a record to list (2026-10-24).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const savedIdea = await hasSavedIdea(prisma);
  // With an idea saved, Your futures leads to the records, so the count isn't asked.
  const expensesListed = !savedIdea && (await hasListedExpenses(prisma));
  return <LandingPage hasSavedIdea={savedIdea} expensesListed={expensesListed} />;
}
