import { DEMO_CLOCK, DEMO_NOTICE } from "../demo/world";

/**
 * Every API answer carries the demo label and the demo clock with it, so a copy of an answer
 * pasted anywhere still says what it is. The API is read-only: each route exports GET and nothing
 * else (Next answers 405 to any other method; tests/external-actions.spec.ts checks).
 */
export function ok(data: unknown) {
  return Response.json(
    { apiVersion: "v0", demo: true, notice: DEMO_NOTICE, demoClock: DEMO_CLOCK, data },
    { headers: { "cache-control": "no-store" } },
  );
}

export function notFound(what: string) {
  return Response.json(
    { apiVersion: "v0", demo: true, notice: DEMO_NOTICE, error: "not-found", what },
    { status: 404 },
  );
}
