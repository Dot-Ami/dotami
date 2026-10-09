/**
 * [8i] How DotAmi's server answers with a receipt's bytes (app/api/expenses/receipt/file/route.ts).
 * Kept here so the tests read the same list the route sends.
 */

/**
 * The answer's headers (expense-records.md § 8, rule 2): plain bytes, never guessed at, never shown as
 * a page, never kept in a cache. If the answer were ever loaded as a page, its own policy lets nothing
 * in it run or load.
 */
export const RECEIPT_FILE_HEADERS = {
  "Content-Type": "application/octet-stream",
  "X-Content-Type-Options": "nosniff",
  "Content-Disposition": "attachment",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
} as const;
