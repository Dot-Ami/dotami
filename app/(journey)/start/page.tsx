import { DestinationPage } from "@/components/front-door/destination-page";
import { keptOnRecord } from "@/lib/front-door/kept";
import { prisma } from "@/lib/prisma";

// Read on every visit: what the data file already holds for questions 1 and 4 counts as answered.
export const dynamic = "force-dynamic";

/** *Your destination*: the four questions after the front door's first door (docs/ui-spec/start/). */
export default async function StartPage() {
  const kept = await keptOnRecord(prisma);
  return <DestinationPage kept={kept} />;
}
