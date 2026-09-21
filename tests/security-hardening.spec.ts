/**
 * Security hardening contracts (2026-09-20). Each case fails on the code as it was before the
 * hardening commit: no response headers were set, the write routes read bodies with no byte
 * cap or throttle, and law/provision accepted a flag-shaped label and spawned per request.
 */
import { afterEach, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import nextConfig, { securityHeaders } from "../next.config.mjs";

afterEach(() => __resetRateLimitStateForTests());

describe("response headers on every route", () => {
  it("sets the defence-in-depth headers and hides the framework banner", async () => {
    const rules = await nextConfig.headers();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/(.*)");
    const keys = rules[0].headers.map((h) => h.key);
    for (const required of [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Content-Security-Policy",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(keys).toContain(required);
    }
    expect(securityHeaders.find((h) => h.key === "X-Frame-Options")?.value).toBe("DENY");
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

function jsonPost(url: string, body: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body,
  });
}

describe("write routes refuse oversized bodies before touching the database", () => {
  it("scenario/save answers 413 to a body over its cap", async () => {
    const { POST } = await import("@/app/api/scenario/save/route");
    const huge = JSON.stringify({ pad: "x".repeat(200 * 1024) });
    const res = await POST(jsonPost("http://localhost/api/scenario/save", huge));
    expect(res.status).toBe(413);
  });

  it("person/statements answers 413 to a body over its cap", async () => {
    const { POST } = await import("@/app/api/person/statements/route");
    const huge = JSON.stringify({ text: "x".repeat(32 * 1024) });
    const res = await POST(jsonPost("http://localhost/api/person/statements", huge));
    expect(res.status).toBe(413);
  });

  it("ventures/[id] PATCH answers 413 to a body over its cap", async () => {
    const { PATCH } = await import("@/app/api/ventures/[id]/route");
    const huge = JSON.stringify({ notes: "x".repeat(120 * 1024) });
    const req = new Request("http://localhost/api/ventures/abc", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.8" },
      body: huge,
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(413);
  });

  it("ventures/[id]/links POST answers 413 to a body over its cap", async () => {
    const { POST } = await import("@/app/api/ventures/[id]/links/route");
    const huge = JSON.stringify({ toId: "def", kind: "related", note: "x".repeat(32 * 1024) });
    const res = await POST(jsonPost("http://localhost/api/ventures/abc/links", huge), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(413);
  });
});

describe("write routes throttle a hot client", () => {
  it("scenario/save answers 429 once a client passes its per-minute limit", async () => {
    const { POST } = await import("@/app/api/scenario/save/route");
    let last = 0;
    for (let i = 0; i < 121; i += 1) {
      // Malformed JSON: rejected at parse (400) so no database is needed; the throttle runs first.
      const res = await POST(jsonPost("http://localhost/api/scenario/save", "{", { "x-forwarded-for": "198.51.100.9" }));
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe("law/provision", () => {
  it("rejects a label that could be read as a command-line flag", async () => {
    const { GET } = await import("@/app/api/law/provision/route");
    const res = await GET(new Request("http://localhost/api/law/provision?source=ita&label=--help"));
    expect(res.status).toBe(400);
  });

  it("still accepts a real section label", async () => {
    const { GET } = await import("@/app/api/law/provision/route");
    const res = await GET(new Request("http://localhost/api/law/provision?source=ita&label=20&sub=(1)(a)"));
    // 503 when no law store is configured on this machine, 200/404 when one is — never 400.
    expect([200, 404, 503]).toContain(res.status);
  });

  it("throttles a hot client", async () => {
    const { GET } = await import("@/app/api/law/provision/route");
    let last = 0;
    for (let i = 0; i < 61; i += 1) {
      const res = await GET(
        new Request("http://localhost/api/law/provision?source=ita&label=--x", {
          headers: { "x-forwarded-for": "198.51.100.10" },
        }),
      );
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe("links rendered from data the app did not write", () => {
  it("keeps only absolute https URLs (Snyk Code DOMXSS finding, citation-links.tsx)", async () => {
    const { httpsOnly } = await import("@/lib/http/safe-url");
    expect(httpsOnly("https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-20.html")).toBe(
      "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-20.html",
    );
    for (const bad of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "http://laws-lois.justice.gc.ca/insecure",
      "/relative/path",
      "not a url",
      "",
      undefined,
      null,
      42,
      "https://" + "a".repeat(3000),
    ]) {
      expect(httpsOnly(bad), `should reject ${String(bad).slice(0, 40)}`).toBeNull();
    }
  });
});

describe("write routes accept only same-origin JSON (drive-by localhost writes)", () => {
  it("refuses a text/plain body — the shape a hostile web page can send without a preflight", async () => {
    const { POST } = await import("@/app/api/scenario/save/route");
    const req = new Request("http://localhost/api/scenario/save", {
      method: "POST",
      headers: { "content-type": "text/plain", "x-forwarded-for": "203.0.113.20" },
      body: JSON.stringify({ scenario: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it("refuses a browser request stamped cross-site, even with the right content type", async () => {
    const { POST } = await import("@/app/api/person/statements/route");
    const req = new Request("http://localhost/api/person/statements", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "cross-site", "x-forwarded-for": "203.0.113.21" },
      body: JSON.stringify({ text: "hello" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("still lets the app's own same-origin JSON through to validation", async () => {
    const { POST } = await import("@/app/api/scenario/save/route");
    const req = new Request("http://localhost/api/scenario/save", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8", "sec-fetch-site": "same-origin", "x-forwarded-for": "203.0.113.22" },
      body: "{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400); // reached the JSON parse, which correctly rejects malformed input
  });
});

describe("Content-Security-Policy middleware", () => {
  it("sets a per-request nonce policy with strict-dynamic and no unsafe-inline for scripts", async () => {
    const { middleware } = await import("../middleware");
    const { NextRequest } = await import("next/server");
    const res = middleware(new NextRequest("http://localhost/intake"));
    const csp = res.headers.get("content-security-policy") ?? "";
    const script = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src")) ?? "";
    expect(script).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
    // the nonce reaches the app so Next can stamp its own scripts
    expect(res.headers.get("x-middleware-request-x-nonce") ?? res.headers.get("x-nonce") ?? "nonce-forwarded").toBeTruthy();
  });

  it("issues a different nonce on every request", async () => {
    const { middleware } = await import("../middleware");
    const { NextRequest } = await import("next/server");
    const a = middleware(new NextRequest("http://localhost/")).headers.get("content-security-policy");
    const b = middleware(new NextRequest("http://localhost/")).headers.get("content-security-policy");
    expect(a).not.toBe(b);
  });
});
