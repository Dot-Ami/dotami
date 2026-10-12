/**
 * A per-key, fixed-window rate limiter: each route counts the requests one caller makes in a window
 * (a minute, for every route today) and answers 429 with a Retry-After once the count is spent.
 * Added by the 2026-07-04 audit (H6) for the routes that call a model; every write route uses it now.
 *
 * Where it runs: inside DotAmi's own Next.js server on the person's own computer. The desktop app
 * starts that server on 127.0.0.1 (desktop/main.mjs), and so does `npm run dev` (-H 127.0.0.1), so
 * only programs on the same computer can reach it: the person's own DotAmi window, a script, or an
 * agent the person runs. `npm start` listens on every network interface (it passes no -H, and
 * Next.js then uses 0.0.0.0) unless it is given -H 127.0.0.1. Every request whose Host isn't this
 * computer's own name is refused before it gets here (middleware.ts), which stops a web page from
 * reaching the server through DNS rebinding; it doesn't stop another machine on the network that
 * sends "Host: localhost" itself.
 *
 * What it is for: a runaway loop in one of those programs can't spend the person's model key (when a
 * copy run from source has one) on the intake parser, or write to the data file, hundreds of times a
 * minute. The limits are sized for a program in a loop, not for a person clicking through the app.
 *
 * The counts live in memory, in the one server process: closing DotAmi empties them, which costs
 * nothing, since a new start begins with no runaway loop either. Kept in memory on purpose, so the
 * limiter writes nothing to the data file.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/** Every 200 calls, drop the buckets whose window ended long ago, so the map can't grow for as long as DotAmi stays open. */
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
 * Which caller a request counts against. Next.js fills in `x-forwarded-for` with the address the
 * request came from when the caller didn't send one (next/dist/server/base-server.js, Next 15.5.27,
 * read 2026-10-12), so on the person's computer every request from DotAmi's own window counts as the
 * same address (127.0.0.1 in the desktop app): in effect, one count per route. A program can send a
 * header of its own and start a new count, so this is a brake on a runaway loop, not a lock; DotAmi
 * has no accounts, and nothing here tells one person from another.
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
