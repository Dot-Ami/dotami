import { afterEach, describe, expect, it, vi } from "vitest";

import { __resetRateLimitStateForTests, checkRateLimit, clientKeyFromRequest } from "@/lib/api/rate-limit";

afterEach(() => {
  __resetRateLimitStateForTests();
  vi.unstubAllEnvs();
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

/**
 * The browser-test switch (DOTAMI_E2E_RATE_LIMITS=opt-in, set only by playwright.config.ts). The
 * names are written out here rather than imported, so renaming one in the code without the config
 * fails a test instead of quietly switching the suite back to shared buckets.
 */
describe("the browser-test switch", () => {
  const LIMIT = { limit: 2, windowMs: 60_000 };
  const labelled = (label: string) => new Request("https://example.com", { headers: { "x-dotami-e2e-rate-limit": label } });
  // A route builds its key the way app/api/settings/route.ts does: "<route>:<client key>".
  const check = (request: Request) => checkRateLimit(`settings:${clientKeyFromRequest(request)}`, LIMIT);

  it("is off unless set: the header changes nothing and every request shares one bucket", () => {
    expect(clientKeyFromRequest(labelled("spec-a"))).toBe("unknown");
    expect(check(labelled("spec-a")).allowed).toBe(true);
    expect(check(new Request("https://example.com")).allowed).toBe(true);
    // Two calls under different labels used up the one shared bucket.
    expect(check(labelled("spec-b")).allowed).toBe(false);
  });

  it("only the exact value opt-in switches it on", () => {
    for (const value of ["1", "true", "OPT-IN", " opt-in", ""]) {
      vi.stubEnv("DOTAMI_E2E_RATE_LIMITS", value);
      expect(clientKeyFromRequest(labelled("spec-a"))).toBe("unknown");
    }
  });

  it("on: a labelled request is counted in its own bucket, at the same limit", () => {
    vi.stubEnv("DOTAMI_E2E_RATE_LIMITS", "opt-in");
    expect(clientKeyFromRequest(labelled("rate-limit-spec"))).toBe("e2e:rate-limit-spec");
    expect(check(labelled("spec-a")).allowed).toBe(true);
    expect(check(labelled("spec-a")).allowed).toBe(true);
    const blocked = check(labelled("spec-a"));
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    // Another label has a bucket of its own.
    expect(check(labelled("spec-b")).allowed).toBe(true);
  });

  it("on: a request without a label is let through and never counted", () => {
    vi.stubEnv("DOTAMI_E2E_RATE_LIMITS", "opt-in");
    const bare = new Request("https://example.com", { headers: { "x-forwarded-for": "1.2.3.4" } });
    for (let i = 0; i < 50; i++) expect(check(bare).allowed).toBe(true);
    // ...and it took nothing from a labelled bucket.
    expect(check(labelled("spec-a")).allowed).toBe(true);
    expect(check(labelled("spec-a")).allowed).toBe(true);
    expect(check(labelled("spec-a")).allowed).toBe(false);
  });

  it("on: a label keeps only plain name characters and 64 of them; one with none left counts as no label", () => {
    vi.stubEnv("DOTAMI_E2E_RATE_LIMITS", "opt-in");
    expect(clientKeyFromRequest(labelled("a b:c/d"))).toBe("e2e:abcd");
    expect(clientKeyFromRequest(labelled("x".repeat(200)))).toBe(`e2e:${"x".repeat(64)}`);
    const onlyPunctuation = labelled(":::");
    for (let i = 0; i < 5; i++) expect(check(onlyPunctuation).allowed).toBe(true);
  });

  it("on: no label can pass itself off as an unlabelled request", () => {
    vi.stubEnv("DOTAMI_E2E_RATE_LIMITS", "opt-in");
    // Each becomes a different bucket ("e2e uncounted" is kept as "e2euncounted").
    for (const label of ["e2e-uncounted", "e2e uncounted", "uncounted"]) {
      expect(check(labelled(label)).allowed).toBe(true);
      expect(check(labelled(label)).allowed).toBe(true);
      expect(check(labelled(label)).allowed, label).toBe(false);
    }
  });

  it("off again: a key that happens to end like the uncounted marker is counted as usual", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("settings:e2e-uncounted", opts).allowed).toBe(true);
    expect(checkRateLimit("settings:e2e-uncounted", opts).allowed).toBe(false);
  });
});
