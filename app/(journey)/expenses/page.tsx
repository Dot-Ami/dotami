import { ExpensesPage } from "@/components/expenses/expenses-page";

export const dynamic = "force-dynamic";

/**
 * /expenses — every expense record; /expenses?idea=<id> opens it on one idea (the link on each card
 * of the ideas page). The idea's id is the only thing that ever goes in this address.
 */
export default async function ExpensesRoutePage({ searchParams }: { searchParams: Promise<{ idea?: string | string[] }> }) {
  const { idea } = await searchParams;
  const initialIdea = typeof idea === "string" && idea.length > 0 ? idea : null;
  return <ExpensesPage initialIdea={initialIdea} />;
}
