import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */

// Fixed headers on every answer. middleware.ts adds the per-request Content-Security-Policy to
// pages; these cover what a nonce isn't needed for. Nothing here changes how the prototype
// behaves: they stop the browser doing things it never asks for (being framed, sniffing types,
// leaking the URL as a referrer, using device APIs).
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // This folder sits inside another project (DotAmi) that has its own lockfile; without this Next
  // guesses the parent folder is the root and traces files from there.
  outputFileTracingRoot: here,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // The read-only API answers with demo data, but the habit matters: no API answer is cached.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
