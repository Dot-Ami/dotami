import { failure, pageOnly } from "@/lib/api/route";

import { AccountInputError, AccountNotFoundError, BankRecordsOffError } from "./source-accounts";
import { FigureInputError, VentureNotFoundError } from "./store";

/**
 * What the /api/figures routes say and answer that is their own: the words a refused caller is told,
 * which store errors answer which status, and the shape of an agree/discard/retract body. The steps
 * every route shares (rate limit, own-window check, body guard, error answer) are lib/api/route.ts.
 */

export const AGREE_ONLY_MESSAGE = "Only the agree prompt in DotAmi's window can confirm figures.";

/** What a caller other than DotAmi's own page is told by the [8g] bank-sources routes. */
export const BANK_SOURCES_PAGE_ONLY =
  "Bank and card accounts can only be listed, allowed or taken back from DotAmi's own window. An outside agent can't reach them.";

/**
 * [8g] Turns a bank-sources store error into the answer. Anything unexpected logs only the error's
 * name and code: a database error can quote what was being written, and an account's name is the
 * person's own words.
 */
export function bankSourcesFailure(route: string, error: unknown): Response {
  return failure(route, error, [
    [AccountInputError, 400],
    [AccountNotFoundError, 404],
    [BankRecordsOffError, 409],
  ]);
}

/**
 * The figures routes' "only DotAmi's own window" check (pageOnly in lib/api/route.ts, which says what
 * it does and doesn't stop), telling a refused caller the agree prompt's words unless the route passes
 * its own.
 */
export function refuseUnlessFromAppPage(request: Request, message: string = AGREE_ONLY_MESSAGE): Response | null {
  return pageOnly(request, message);
}

/**
 * Turns a store error into the response. Unknown failures log only the error's name and code under
 * "figures/<route>" — never the error itself, because a database error can carry the values being
 * written and figures never go in a log (privacy review, rule 2).
 */
export function storeErrorResponse(route: string, error: unknown): Response {
  return failure(`figures/${route}`, error, [
    [VentureNotFoundError, 404],
    [FigureInputError, 400],
  ]);
}

/** Pulls `ventureId` and a list of ids out of an agree/discard/retract body, or says what is wrong. */
export function parseIdsBody(body: unknown): { ventureId: string; figureIds: unknown } | { error: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as { ventureId?: unknown; figureIds?: unknown };
  if (typeof b.ventureId !== "string" || b.ventureId.length === 0) return { error: "Say which idea this is for." };
  return { ventureId: b.ventureId, figureIds: b.figureIds };
}
