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

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
