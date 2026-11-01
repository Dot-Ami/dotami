import { failure } from "@/lib/api/route";
import { VentureNotFoundError } from "@/lib/figures/store";

import { FutureInputError } from "./types";

/**
 * What the cockpit's routes (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built") say and
 * answer that is their own. The writes are the person's own clicks (a status, a tick, a month, a skill
 * mark), so they answer only DotAmi's own window, as the settings routes do (pageOnly with the words
 * below, then the rate limit; lib/api/route.ts); an agent's way to suggest one is the Lens's proposal,
 * later. The reads count against the rate limit only.
 */

export const COCKPIT_PAGE_ONLY =
  "Your progress, your date, your pick of job and your skill marks can only be changed from DotAmi's own window. An outside agent can't change them yet.";

/**
 * Turns a storage error into the answer: the storage's own plain words for something it refused, 404 for
 * an idea that isn't there, and for anything else only the error's name and code in the log (a database
 * error can quote what was being written).
 */
export function futureFailure(route: string, error: unknown): Response {
  return failure(route, error, [
    [FutureInputError, 400],
    [VentureNotFoundError, 404],
  ]);
}
