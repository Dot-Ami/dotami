/**
 * The prototype answers only on this computer's own names (the same DNS-rebinding guard DotAmi
 * uses, lib/http/allowed-host.ts there). A page on another site can point its own domain at
 * 127.0.0.1, but it can't change the Host header the browser sends, so every request whose Host
 * isn't a loopback name is refused before any page or API route runs (middleware.ts).
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The host name in a Host header, lower-cased and without its port. */
export function hostName(hostHeader: string): string {
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith("[")) return host.slice(0, host.indexOf("]") + 1);
  return host.split(":")[0];
}

export function isAllowedHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const name = hostName(hostHeader);
  return LOOPBACK.has(name) || name.endsWith(".localhost");
}
