import { NextResponse, type NextRequest } from "next/server";

import { isAllowedHost } from "@/lib/http/allowed-host";

/**
 * Two things on every request, before any page or API route runs:
 *
 * 1. The host check (lib/http/allowed-host.ts): a local prototype answers only on localhost.
 * 2. For pages, a Content-Security-Policy with a per-request nonce. `connect-src 'self'` and
 *    `form-action 'self'` are the browser-level half of "nothing leaves without your approval":
 *    even a bug in a page can't post a draft to another site. The other half is that there is no
 *    code that sends anything (lib/rules/approval.ts, tests/external-actions.spec.ts).
 *
 * The nonce must differ per response, so app/layout.tsx renders every page per request.
 */
export function middleware(request: NextRequest) {
  if (!isAllowedHost(request.headers.get("host"))) {
    return new NextResponse("This prototype only answers on this computer's own address.", {
      status: 421,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Static build output skips the middleware; everything else, the API included, goes through it.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
