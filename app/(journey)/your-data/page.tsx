import { YourDataPage } from "@/components/your-data/your-data-page";
import { logRouteError } from "@/lib/api/log-error";
import { readHoldings, type Holdings } from "@/lib/privacy/holdings";
import { prisma } from "@/lib/prisma";
import { readSettingsToday } from "@/lib/settings/today";

// Read on every visit, on the server — the same as /settings. The page lists what the data file
// holds right now, so a copy cached from before a figure was agreed to would be a stale claim.
export const dynamic = "force-dynamic";

export default async function YourDataRoutePage() {
  let holdings: Holdings | null = null;
  try {
    holdings = await readHoldings(prisma, readSettingsToday());
  } catch (error) {
    // The page says it couldn't read the file; the log gets the error's name and code, never the error.
    logRouteError("your-data", error);
  }
  return <YourDataPage holdings={holdings} />;
}
