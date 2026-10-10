import { ExpensesPage } from "@/components/expenses/expenses-page";
import { receiptLockState, receiptsSetAsideTo } from "@/lib/expenses/receipts/lock";
import { readSettingsToday } from "@/lib/settings/today";

export const dynamic = "force-dynamic";

/**
 * /expenses — every expense record; /expenses?idea=<id> opens it on one idea (the link on each card
 * of the ideas page). The idea's id is the only thing that ever goes in this address.
 */
export default async function ExpensesRoutePage({ searchParams }: { searchParams: Promise<{ idea?: string | string[] }> }) {
  const { idea } = await searchParams;
  const initialIdea = typeof idea === "string" && idea.length > 0 ? idea : null;
  // Only the state of the receipts' key goes to the page ([8i]), never the key; and whether this is the
  // desktop app, which restarts by itself after Start a new key (expense-records.md § 11).
  return (
    <ExpensesPage
      initialIdea={initialIdea}
      receiptProtection={receiptLockState()}
      receiptsSetAside={receiptsSetAsideTo()}
      desktop={readSettingsToday().desktop}
    />
  );
}
