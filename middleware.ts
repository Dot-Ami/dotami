import { NextResponse, type NextRequest } from "next/server";

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
 * The nonce makes every page dynamic (it must differ per response) — right for a self-hosted,
 * single-user app. API routes and Next's static assets are excluded by the matcher; they get
 * the fixed headers from next.config.mjs instead.
 */
export function middleware(request: NextRequest) {
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
  matcher: [
    {
      // Pages only: API routes, Next's static/image assets and the favicon keep next.config's headers.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
