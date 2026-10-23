/**
 * The launch secret: DotAmi's server answers only DotAmi's own window (2026-10-23).
 *
 * Why: the server listens on 127.0.0.1, and that address is shared by every Windows account on the
 * computer. Before this, while DotAmi was open, a program running under ANOTHER standard account on a
 * shared PC could call http://127.0.0.1:<port>/api/... and read or change the person's data with no
 * login, even though Windows' folder permissions and the encrypted data file kept that account out of
 * the files themselves. The `Sec-Fetch-Site: same-origin` check on the agree and settings routes
 * (lib/figures/http.ts) didn't stop it: any program can write that header.
 *
 * How: each time the desktop app starts, its main process makes a fresh random secret (32 bytes),
 * hands it to the server in its environment (DOTAMI_LAUNCH_SECRET, desktop/main.mjs serverEnv), and
 * adds it as a request header to every request DotAmi's own window makes to the server
 * (desktop/main.mjs sendLaunchSecret). The page's scripts never see it: the header is added below the
 * page, in Electron's network layer. middleware.ts refuses every request without the exact header
 * before it reaches a page, a server action or an API route; the agree and settings routes check it
 * again themselves (refuseUnlessFromAppPage).
 *
 * Honest limit: a program running as the SAME Windows user can read the app's memory and the
 * server's environment, so this does not stop it. It stops other accounts on the computer, and
 * anything that can reach the port but not the person's own processes.
 *
 * This file runs inside middleware (Next's edge sandbox), so it uses no Node modules.
 */

/** The request header DotAmi's window sends. Lower-case: that is how the Headers API names it. */
export const LAUNCH_SECRET_HEADER = "x-dotami-launch-secret";

/** The environment variable the server reads the secret from. */
export const LAUNCH_SECRET_ENV = "DOTAMI_LAUNCH_SECRET";

/**
 * Shorter than this is not a secret worth the name: 32 random bytes in base64url is 43 characters,
 * and a 24-byte secret (32 characters) is the least anything here accepts.
 */
export const MIN_SECRET_LENGTH = 32;

export type LaunchGuard =
  /** A copy run from source (npm run dev / start) with no secret: the guard is off (README § Run it). */
  | { state: "off" }
  | { state: "on"; secret: string }
  /** The desktop app with no usable secret: something went wrong, so everything is refused. */
  | { state: "broken"; reason: string };

/**
 * What the guard does for this server, from its environment. The desktop app (DOTAMI_DESKTOP=1)
 * fails closed: a missing or short secret refuses every request rather than answering everyone. A
 * developer copy with no secret has the guard off; one given a secret (the browser tests do) has it on.
 */
export function launchGuardFromEnv(env: Record<string, string | undefined>): LaunchGuard {
  const secret = env[LAUNCH_SECRET_ENV] ?? "";
  if (secret.length >= MIN_SECRET_LENGTH) return { state: "on", secret };
  if (secret.length > 0) return { state: "broken", reason: "its launch secret is too short" };
  if (env.DOTAMI_DESKTOP === "1") return { state: "broken", reason: "it was started without its launch secret" };
  return { state: "off" };
}

/**
 * True when `given` is exactly `secret`, taking the same time whichever character differs, so the
 * answer's timing can't be used to guess the secret one character at a time. Only the length can
 * show, and the length is not secret (always 43 characters from the desktop app).
 */
export function sameSecret(given: string | null | undefined, secret: string): boolean {
  if (typeof given !== "string" || given.length !== secret.length) return false;
  let difference = 0;
  for (let i = 0; i < secret.length; i++) difference |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return difference === 0;
}

/** What a refused caller is told. It names no port, no folder and nothing of the person's. */
export const LAUNCH_SECRET_REFUSAL = "DotAmi only answers its own window.";

/**
 * A 403 unless the request carries the launch secret (or the guard is off), else null. `api` picks a
 * JSON body (what the app's own fetch calls expect) over plain text (a page).
 */
export function refuseWithoutLaunchSecret(request: { headers: Headers }, guard: LaunchGuard, api = true): Response | null {
  if (guard.state === "off") return null;
  if (guard.state === "on" && sameSecret(request.headers.get(LAUNCH_SECRET_HEADER), guard.secret)) return null;
  const message = guard.state === "broken" ? `DotAmi's server can't answer: ${guard.reason}. Restart DotAmi.` : LAUNCH_SECRET_REFUSAL;
  return api
    ? new Response(JSON.stringify({ error: message }), { status: 403, headers: { "content-type": "application/json; charset=utf-8" } })
    : new Response(message, { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
}
