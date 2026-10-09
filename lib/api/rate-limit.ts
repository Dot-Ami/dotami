/**
 * Per-key fixed-window rate limiter for the LLM-backed API routes (audit-2026-07-04 H6:
 * no rate limiting or body-size caps on any of the three Anthropic-calling routes before
 * a real `ANTHROPIC_API_KEY` lands on Vercel).
 *
 * Deliberately in-memory, not a durable store: this process holds one map per warm
 * serverless instance, so a cold start or a second concurrent instance resets or forks
 * the count. That's an honest limitation, not a hidden one — it still stops a single hot
 * client (browser tab, script, bot) from hammering a route inside one instance's
 * lifetime, which is the realistic v0 threat model with a stub single-user auth model.
 * A durable per-key store (Vercel KV / Upstash) is the Phase 7 upgrade once real
 * multi-tenant auth and a paid LLM key are both live.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/** Opportunistic sweep so `buckets` doesn't grow unbounded across a long-lived instance. */
let callsSinceSweep = 0;
const SWEEP_EVERY_N_CALLS = 200;

function sweep(now: number, maxWindowMs: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > maxWindowMs * 2) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Max requests allowed inside one window. */
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Present only when `allowed` is false. */
  retryAfterSeconds?: number;
}

/**
 * The browser-test switch. `playwright.config.ts` starts the test server with
 * `DOTAMI_E2E_RATE_LIMITS=opt-in`, and nothing else sets it (the desktop app removes it from its
 * server's environment: desktop/main.mjs `serverEnv`). Without it, nothing below changes anything.
 *
 * Why it exists: every request in the browser suite comes from one client, so all of them land in
 * one bucket per route ("unknown"). One server serves the whole suite, so as tests were added the
 * suite on a fast machine made more settings calls in a minute than a person would, and the real
 * limits started answering 429 to tests that had done nothing wrong. Raising a limit each time
 * that happened (as was done for the figures list) only lasts until the next test.
 *
 * With the switch on, a request is counted only when it names its own bucket in the
 * `x-dotami-e2e-rate-limit` header; the browser test that checks the limits does, and sees the
 * shipped limit hold. Every other request in the suite is not counted, so the suite's size can
 * never trip a limit by accident. The limits themselves are the same numbers either way.
 */
export const E2E_RATE_LIMITS_ENV = "DOTAMI_E2E_RATE_LIMITS";
export const E2E_RATE_LIMIT_HEADER = "x-dotami-e2e-rate-limit";
// What clientKeyFromRequest answers for an unlabelled request while the switch is on. A label
// becomes "e2e:<label>" and keeps no spaces, so no label can end a key with this.
const E2E_UNCOUNTED = "e2e uncounted";

function e2eOptIn(): boolean {
  // Read on every call rather than once at start-up, so the unit tests can switch it per test.
  return process.env[E2E_RATE_LIMITS_ENV] === "opt-in";
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  // Browser-test server only: a request that named no bucket is let through and not counted.
  // Every call site builds its key as "<route>:<client key>", so the marker is always the end.
  if (e2eOptIn() && key.endsWith(`:${E2E_UNCOUNTED}`)) return { allowed: true };

  const now = Date.now();

  callsSinceSweep += 1;
  if (callsSinceSweep >= SWEEP_EVERY_N_CALLS) {
    callsSinceSweep = 0;
    sweep(now, options.windowMs);
  }

  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= options.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (existing.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.windowStart + options.windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}

/**
 * Best-effort client identity for an unauthenticated route. `x-forwarded-for` is
 * client-suppliable and spoofable — this is a throttle, not an auth boundary. Real
 * per-user limits arrive with real auth (Phase 7).
 */
export function clientKeyFromRequest(request: Request): string {
  if (e2eOptIn()) {
    // Browser-test server only (see E2E_RATE_LIMITS_ENV above): the header names the bucket.
    // Plain name characters, kept short, so a label can't grow the bucket map or reshape the key.
    const label = (request.headers.get(E2E_RATE_LIMIT_HEADER) ?? "").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 64);
    return label ? `e2e:${label}` : E2E_UNCOUNTED;
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests — slow down and try again shortly." },
    {
      status: 429,
      headers: result.retryAfterSeconds ? { "Retry-After": String(result.retryAfterSeconds) } : undefined,
    },
  );
}

/** Test-only: clears all buckets between test cases. */
export function __resetRateLimitStateForTests() {
  buckets.clear();
  callsSinceSweep = 0;
}
