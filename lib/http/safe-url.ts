/**
 * The only URLs this app renders as clickable links come from data it did not write itself —
 * the law store's response, catalog citations. A link is rendered only when it parses as an
 * absolute `https:` URL; anything else (a `javascript:` or `data:` URL, a relative path, junk)
 * becomes nothing. Official statute and tax-authority sources are all https.
 */
export function httpsOnly(candidate: unknown): string | null {
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  return url.protocol === "https:" ? url.toString() : null;
}
