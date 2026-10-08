/**
 * What a route may write to the log when something fails: the error's name and its code, never
 * the error itself. A database error can quote the values being written — a statement's words, an
 * idea's name, a revenue estimate — and the log is a plain file on the person's computer that
 * ends up in bug reports (docs/architecture/figures-privacy-review.md, rule 2).
 *
 * lib/figures/http.ts `storeErrorResponse` does the same for the figures routes. Every other
 * route calls this instead of `console.error(label, error)`; tests/error-logging.spec.ts fails
 * if a route logs an error object, or anything else, on its own.
 */

/** "PrismaClientKnownRequestError, P2002" — the error's name and code, or "unknown, -" when it has neither. */
export function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : "unknown";
  const code = typeof (error as { code?: unknown } | null)?.code === "string" ? (error as { code: string }).code : "-";
  return `${name}, ${code}`;
}

/** Writes one line: which route failed and the error's name and code. `route` is a fixed label like "scenario/save". */
export function logRouteError(route: string, error: unknown): void {
  const summary = describeError(error);
  console.error(`[${route}] failed (${summary})`);
}
