/** @type {import('next').NextConfig} */

// Defence-in-depth headers for a self-hosted, single-user app. None of these change how the
// app behaves; they stop a browser from doing things the app never asks for (framing it on
// another site, sniffing content types, leaking the URL as a referrer, using device APIs).
// A full Content-Security-Policy needs per-request nonces (Next.js inlines scripts) and is a
// follow-up; `frame-ancestors` is the one CSP directive that is safe to set on its own.
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// A worker started from one of DotAmi's own script files (the return reader's pdf.js worker,
// lib/figures/return/pdf-text.worker.ts) does NOT run under the page's policy: a worker takes its
// Content-Security-Policy from the response that delivered its script, and Next's static files
// skip middleware.ts. So the static files carry this policy of their own. It lets a worker load
// DotAmi's own script chunks and nothing else: no fetch, XMLHttpRequest, WebSocket or import from
// anywhere, DotAmi's own server included, and no eval. A policy on an ordinary script file, a
// stylesheet or an image does nothing (browsers apply it only to pages and workers), so the rest of
// the app is unaffected. Next's development server runs code through eval, so it keeps that there.
const dev = process.env.NODE_ENV === "development";
export const workerPolicy = `default-src 'none'; script-src 'self'${dev ? " 'unsafe-eval'" : ""}; frame-ancestors 'none'`;

// The desktop app ([7b]) runs a self-contained build of this server inside Electron. It builds
// into its own folder so a desktop build never overwrites the `.next` a running `npm run dev`
// or `next start` is using; every other build is unchanged. Set by desktop/build.mjs.
const desktopBuild = process.env.DOTAMI_DESKTOP_BUILD === "1";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Not `outputFileTracingExcludes`: Next 15.5 joins those globs with the OS path separator, so on
  // Windows they never match (node_modules/next/dist/build/collect-build-traces.js:503). The
  // build script removes and checks for private files instead.
  ...(desktopBuild ? { output: "standalone", distDir: ".next-desktop" } : {}),
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Same key as above: for these paths Next sends the later one (its documented rule).
      { source: "/_next/static/:path*", headers: [{ key: "Content-Security-Policy", value: workerPolicy }] },
    ];
  },
};

export default nextConfig;
