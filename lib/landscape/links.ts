/**
 * The links a person keeps in "Businesses you're watching" (docs/architecture/competitive-landscape.md § 6.2
 * item 5): only http: and https: addresses are ever kept or drawn as a link. Shared by the storage (which
 * refuses anything else, so the routes do too), by the read-back of a stored row (a hand-edited file can't
 * slip one through) and by the form on screen (which says why before anything is sent).
 *
 * Why so strict: the panel draws each link as an <a href>. A `javascript:` address there runs code in
 * DotAmi's own window when clicked; `data:` can draw a page that looks like DotAmi's; `file:` points into the
 * computer. None of them is a business's page, so none is kept.
 *
 * Pure: no database, no request. DotAmi never opens or fetches any of these links itself; the person's
 * browser opens one only when they click it.
 */

/** Longest link kept, in characters (after the browser's own reading of it). */
export const LINK_MAX = 2048;

/**
 * The caps on what the list keeps, sized for a person typing, not for a program in a loop. Here, in a module
 * with no database code, so the form on screen checks the same numbers the storage does.
 */
export const WATCHED_LIMITS = {
  /** Characters in a business's name. */
  name: 200,
  /** Characters in the person's note. */
  note: 2000,
  /** Ad links per business. */
  adLinks: 20,
  /** Businesses per idea. */
  perIdea: 500,
} as const;

/**
 * The link as the browser reads it (`URL.href`) when it is an http: or https: address with a host, no name or
 * password written into it, and no longer than LINK_MAX; otherwise null.
 *
 * The browser's own parser decides, rather than a pattern: it lowercases the scheme, drops the spaces and
 * control characters the HTML standard ignores around it, and resolves tricks such as a tab inside
 * "java\tscript:". What is kept is exactly what was checked, so what is drawn later is what was allowed now.
 */
export function safeLink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > LINK_MAX) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // A relative address ("example.com", "//example.com") has no scheme of its own: not a link here.
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.hostname.length === 0) return null;
  // A name or password written into a link would be kept in the data file and shown on screen.
  if (url.username !== "" || url.password !== "") return null;
  return url.href.length > LINK_MAX ? null : url.href;
}

/** Whether a link is one the desktop app opens in the person's browser: it opens https: only (desktop/main.mjs). */
export function opensFromDesktop(link: string): boolean {
  return link.startsWith("https://");
}

/** A calendar day written YYYY-MM-DD that exists (no 30 February). */
export function isCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d));
  return day.getUTCFullYear() === y && day.getUTCMonth() === m - 1 && day.getUTCDate() === d;
}
