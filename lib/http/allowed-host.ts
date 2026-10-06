/**
 * Which addresses DotAmi answers on: this computer's own names, never anyone else's.
 *
 * Why: DNS rebinding. A web page on attacker.example can re-point its own domain at 127.0.0.1
 * and then talk to a local app as if it were its own site — same-origin to the browser, so the
 * cross-site check in lib/api/body-limit.ts doesn't stop it, and it can read the answers. The
 * one thing it can't change is the Host header: the browser sends the attacker's domain. So
 * every request whose Host isn't a loopback name is refused before it reaches a page or an API
 * route (middleware.ts). Found 2026-10-06 in the privacy review that opens the figures store
 * ([8a]): GET /api/ventures with `Host: evil.example` returned every venture.
 *
 * `*.localhost` names are loopback by definition (RFC 6761) and can't be registered by anyone.
 * Someone who deliberately serves DotAmi to their own network lists the extra names in
 * DOTAMI_ALLOWED_HOSTS (comma-separated: a LAN address or machine name) — README § Run it.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The host name in a Host header, lower-cased and without its port. */
export function hostName(hostHeader: string): string {
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith("[")) return host.slice(0, host.indexOf("]") + 1);
  return host.split(":")[0];
}

export function allowedHostsFromEnv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedHost(hostHeader: string | null, extra: readonly string[] = []): boolean {
  // HTTP/1.1 requires a Host header; a request without one isn't from a browser page or the app.
  if (!hostHeader) return false;
  const name = hostName(hostHeader);
  return LOOPBACK.has(name) || name.endsWith(".localhost") || extra.includes(name);
}
