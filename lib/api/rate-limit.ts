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

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
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
