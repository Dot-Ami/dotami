import { failure } from "@/lib/api/route";
import { VentureNotFoundError } from "@/lib/figures/store";

import { ExpenseInputError } from "./store";

/**
 * What the /api/expenses routes say and answer that is their own: the agree prompt's words, which store
 * errors answer which status, and the shape of a body's idea and ids. The steps every route shares,
 * the "only DotAmi's own page" check among them, are lib/api/route.ts: one definition of what counts
 * as the app's page, for figures and expenses alike.
 */

export const AGREE_ONLY_MESSAGE = "Only the agree prompt in DotAmi's window can confirm expense records.";

/**
 * Turns a store error into the response. Unknown failures log only the error's name and code under
 * "expenses/<route>" — never the error itself, because a database error can carry the values being
 * written, and what the person paid, to whom and for what never goes in a log.
 */
export function storeErrorResponse(route: string, error: unknown): Response {
  return failure(`expenses/${route}`, error, [
    [VentureNotFoundError, 404],
    [ExpenseInputError, 400],
  ]);
}

/**
 * Reads the idea a body names, the expense store's scope (lib/expenses/store.ts): an idea's id, null
 * for the records not attached to any idea, or absent for any of the person's records. Anything else
 * (a number, an empty string) is refused rather than read as "any".
 */
export function parseScope(body: unknown): { scope: string | null | undefined } | { error: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as { ventureId?: unknown };
  if (!Object.hasOwn(b, "ventureId") || b.ventureId === undefined) return { scope: undefined };
  if (b.ventureId === null) return { scope: null };
  if (typeof b.ventureId === "string" && b.ventureId.length > 0) return { scope: b.ventureId };
  return { error: "Name an idea by its id, or null for records not attached to an idea." };
}

/**
 * Pulls the scope and a list of ids out of an agree/discard/retract body, or says what is wrong.
 * `ventureId` is optional since records may be "not attached yet" (the maintainer's decision,
 * 2026-10-08): absent means any of the person's records.
 */
export function parseIdsBody(body: unknown): { ventureId: string | null | undefined; expenseIds: unknown } | { error: string } {
  const scope = parseScope(body);
  if ("error" in scope) return scope;
  const b = (typeof body === "object" && body !== null ? body : {}) as { expenseIds?: unknown };
  return { ventureId: scope.scope, expenseIds: b.expenseIds };
}
