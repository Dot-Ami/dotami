import { NextResponse, type NextRequest } from "next/server";

import { allowedHostsFromEnv, isAllowedHost } from "@/lib/http/allowed-host";

/**
 * Content-Security-Policy with a per-request nonce (2026-09-20 hardening).
 *
 * Scripts: only the app's own files and inline scripts that carry this request's nonce —
 * Next.js stamps the nonce on every script it emits when it finds it in the request's CSP
 * header; `'strict-dynamic'` lets those trusted scripts load what they need and nothing else.
 * No `'unsafe-inline'` for scripts, so an injected `<script>` cannot run even if some future
 * change renders untrusted HTML. Styles allow inline because Tailwind-free layout bits
 * (`style={{…}}`) render as attributes; that is the standard trade and does not weaken script
 * protection. Everything else (connections, images, fonts, frames, forms) is same-origin.
 *
 * The nonce must differ per response, so every page has to render per request — and setting a
 * header here does NOT make that happen on its own: a page with nothing request-specific is
 * pre-rendered at build time and its scripts get no nonce. `app/layout.tsx` forces per-request
 * rendering (`await connection()`); without it the landing and intake pages were dead in
 * production builds. Right for a self-hosted, single-user app. API routes pass through after the
 * host check without a CSP and keep the fixed headers from next.config.mjs; Next's static assets
 * skip the middleware entirely (matcher below).
 */
export function middleware(request: NextRequest) {
  // First, on every request — pages, API routes, prefetches: answer only on this computer's own
  // address (DNS rebinding guard, lib/http/allowed-host.ts).
  if (!isAllowedHost(request.headers.get("host"), allowedHostsFromEnv(process.env.DOTAMI_ALLOWED_HOSTS))) {
    return new NextResponse("DotAmi only answers on this computer's own address.", {
      status: 421,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  // API routes keep next.config's fixed headers, and Next's link prefetches get no CSP of their
  // own (they used to skip the middleware entirely; a header a page can set is no reason to skip
  // the host check above, so they now pass through here instead).
  const prefetch = request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch";
  if (request.nextUrl.pathname.startsWith("/api/") || prefetch) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // Next's dev server evaluates source maps and HMR payloads; production never needs eval.
  const dev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    // DotAmi has no frames. A receipt is never shown in one, so not even a mistake could hand one to
    // Chromium's built-in PDF viewer (docs/architecture/expense-records.md § 8, rule 5).
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Everything except Next's own static and image assets and the favicon (public build files,
  // no data): the host check must see every page, API route and prefetch.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
