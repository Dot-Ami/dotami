import { PickFuturePage } from "@/components/front-door/pick-future-page";
import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { listedRoads } from "@/lib/front-door/futures";
import { roadJobNames } from "@/lib/front-door/road-jobs";

/**
 * *Pick a future*: the three steps, then every written future, in the order added (docs/ui-spec/futures/). The
 * titles of the jobs each road is written for are read here, on the server, from the NOC file.
 */
export default function FuturesPage() {
  return <PickFuturePage roadJobs={roadJobNames(listedRoads(roadsV2026))} />;
}
