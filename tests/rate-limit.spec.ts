import { afterEach, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests, checkRateLimit, clientKeyFromRequest } from "@/lib/api/rate-limit";

afterEach(() => {
  __resetRateLimitStateForTests();
});

describe("checkRateLimit", () => {
  it("allows requests under the limit and blocks once the window fills", () => {
    const opts = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimit("key-a", opts).allowed).toBe(true);
    expect(checkRateLimit("key-a", opts).allowed).toBe(true);
    expect(checkRateLimit("key-a", opts).allowed).toBe(true);

    const blocked = checkRateLimit("key-a", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("key-b", opts).allowed).toBe(true);
    expect(checkRateLimit("key-c", opts).allowed).toBe(true);
    expect(checkRateLimit("key-b", opts).allowed).toBe(false);
  });
});

describe("clientKeyFromRequest", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientKeyFromRequest(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then unknown", () => {
    const withRealIp = new Request("https://example.com", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(clientKeyFromRequest(withRealIp)).toBe("9.9.9.9");

    const bare = new Request("https://example.com");
    expect(clientKeyFromRequest(bare)).toBe("unknown");
  });
});
