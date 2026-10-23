import { readFileSync } from "node:fs";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { refuseUnlessFromAppPage } from "@/lib/figures/http";
import {
  LAUNCH_SECRET_ENV,
  LAUNCH_SECRET_HEADER,
  launchGuardFromEnv,
  refuseWithoutLaunchSecret,
  sameSecret,
} from "@/lib/http/launch-secret";

/**
 * The launch secret (lib/http/launch-secret.ts): the server answers only DotAmi's own window, not
 * another program on the computer (another Windows account's included) that can reach 127.0.0.1.
 * e2e/launch-secret.spec.ts checks the same against the real server; e2e-desktop/desktop.spec.ts
 * against the desktop app.
 */

// An invented secret of the real length (43 characters, 32 bytes in base64url). Not a real one.
const SECRET = "test-secret-0123456789-abcdefghijklmnopqrst";
const OTHER = "test-secret-0123456789-abcdefghijklmnopqrsX";

function call(path: string, headers: Record<string, string> = {}, method = "GET") {
  return new NextRequest(`http://127.0.0.1:3000${path}`, { method, headers: { host: "127.0.0.1:3000", ...headers } });
}

async function middlewareFor(env: Record<string, string | undefined>) {
  vi.stubEnv(LAUNCH_SECRET_ENV, env[LAUNCH_SECRET_ENV] ?? "");
  vi.stubEnv("DOTAMI_DESKTOP", env.DOTAMI_DESKTOP ?? "");
  return (await import("../middleware")).middleware;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("launch secret: what the server does", () => {
  it("is on with a secret, off in a developer copy without one, and refuses everything in a desktop app without one", () => {
    expect(SECRET).toHaveLength(43);
    expect(launchGuardFromEnv({ [LAUNCH_SECRET_ENV]: SECRET })).toEqual({ state: "on", secret: SECRET });
    expect(launchGuardFromEnv({})).toEqual({ state: "off" });
    expect(launchGuardFromEnv({ DOTAMI_DESKTOP: "1" }).state).toBe("broken");
    expect(launchGuardFromEnv({ DOTAMI_DESKTOP: "1", [LAUNCH_SECRET_ENV]: "" }).state).toBe("broken");
    // A secret too short to be one fails closed, desktop or not: it never quietly turns the guard off.
    expect(launchGuardFromEnv({ [LAUNCH_SECRET_ENV]: "short" }).state).toBe("broken");
  });

  it("compares the whole secret: one character off, a prefix, a longer string or nothing is refused", () => {
    expect(sameSecret(SECRET, SECRET)).toBe(true);
    for (const wrong of [OTHER, SECRET.slice(0, -1), `${SECRET}x`, "", null, undefined, SECRET.toUpperCase()]) {
      expect(sameSecret(wrong, SECRET)).toBe(false);
    }
  });

  it("refuses with a 403 that names nothing of the person's", async () => {
    const guard = launchGuardFromEnv({ [LAUNCH_SECRET_ENV]: SECRET });
    const refused = refuseWithoutLaunchSecret({ headers: new Headers() }, guard)!;
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({ error: "DotAmi only answers its own window." });
    expect(refuseWithoutLaunchSecret({ headers: new Headers({ [LAUNCH_SECRET_HEADER]: SECRET }) }, guard)).toBeNull();
    expect(refuseWithoutLaunchSecret({ headers: new Headers() }, { state: "off" })).toBeNull();
  });
});

describe("launch secret: middleware.ts", () => {
  it("refuses an API route, a page, a server action and a prefetch that come without the secret", async () => {
    const middleware = await middlewareFor({ [LAUNCH_SECRET_ENV]: SECRET });
    expect(middleware(call("/api/ventures")).status).toBe(403);
    expect(middleware(call("/api/figures/agree", { "sec-fetch-site": "same-origin" }, "POST")).status).toBe(403);
    expect(middleware(call("/ventures")).status).toBe(403);
    expect(middleware(call("/settings", { "next-action": "abc" }, "POST")).status).toBe(403);
    expect(middleware(call("/ventures", { "next-router-prefetch": "1" })).status).toBe(403);
    expect(middleware(call("/api/ventures", { [LAUNCH_SECRET_HEADER]: OTHER })).status).toBe(403);
  });

  it("lets the window's requests through, with the page's security policy as before", async () => {
    const middleware = await middlewareFor({ [LAUNCH_SECRET_ENV]: SECRET });
    expect(middleware(call("/api/ventures", { [LAUNCH_SECRET_HEADER]: SECRET })).status).toBe(200);
    const page = middleware(call("/ventures", { [LAUNCH_SECRET_HEADER]: SECRET }));
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain("script-src");
  });

  it("checks the address first: the secret doesn't get a rebound page in", async () => {
    const middleware = await middlewareFor({ [LAUNCH_SECRET_ENV]: SECRET });
    expect(middleware(call("/api/ventures", { host: "evil.example:3000", [LAUNCH_SECRET_HEADER]: SECRET })).status).toBe(421);
  });

  it("in the desktop app without a secret, refuses everything rather than answering everyone", async () => {
    const middleware = await middlewareFor({ DOTAMI_DESKTOP: "1" });
    expect(middleware(call("/api/ventures")).status).toBe(403);
    expect(middleware(call("/")).status).toBe(403);
  });

  it("in a developer copy run without a secret, answers as before (README § Run it says so)", async () => {
    const middleware = await middlewareFor({});
    expect(middleware(call("/api/ventures")).status).toBe(200);
  });

  it("covers everything but Next's own build files and the icon: _next/image is guarded too", () => {
    const source = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
    const body = source.slice(source.indexOf("export function middleware"));
    // After the address check, before anything else runs.
    expect(body.indexOf("isAllowedHost(")).toBeLessThan(body.indexOf("refuseWithoutLaunchSecret("));
    expect(body.indexOf("refuseWithoutLaunchSecret(")).toBeLessThan(body.indexOf('startsWith("/api/") || prefetch'));
    const matcher = source.slice(source.indexOf("matcher:"));
    expect(matcher.slice(0, matcher.indexOf("]"))).toBe('matcher: ["/((?!_next/static|favicon.ico).*)"');
  });
});

describe("launch secret: the agree and settings routes check it themselves too", () => {
  it("a forged Sec-Fetch-Site without the secret is refused; with it, the page check passes", () => {
    vi.stubEnv(LAUNCH_SECRET_ENV, SECRET);
    expect(refuseUnlessFromAppPage(new Request("http://127.0.0.1/api/figures/agree", { headers: { "sec-fetch-site": "same-origin" } }))?.status).toBe(403);
    expect(
      refuseUnlessFromAppPage(new Request("http://127.0.0.1/api/figures/agree", { headers: { "sec-fetch-site": "same-origin", [LAUNCH_SECRET_HEADER]: SECRET } })),
    ).toBeNull();
    // The secret alone isn't enough either: the page check still stands.
    expect(refuseUnlessFromAppPage(new Request("http://127.0.0.1/api/figures/agree", { headers: { [LAUNCH_SECRET_HEADER]: SECRET } }))?.status).toBe(403);
  });
});

describe("launch secret: the desktop app", () => {
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");

  it("makes a fresh 32-byte secret each launch and gives the server only its own, never one from the shell", () => {
    expect(main).toMatch(/const launchSecret = randomBytes\(32\)\.toString\("base64url"\)/);
    const serverEnv = main.slice(main.indexOf("function serverEnv("), main.indexOf("function databaseLockEnv("));
    expect(serverEnv).toContain("DOTAMI_LAUNCH_SECRET: _shellSecret");
    expect(serverEnv).toContain("DOTAMI_LAUNCH_SECRET: launchSecret");
  });

  it("sends the header under the same name the server reads", () => {
    expect(main).toContain(`const LAUNCH_SECRET_HEADER = "${LAUNCH_SECRET_HEADER}";`);
  });

  it("adds the header below the page, only to requests for its own server's address", () => {
    const send = main.slice(main.indexOf("function sendLaunchSecret("));
    expect(send).toContain("webRequest.onBeforeSendHeaders");
    expect(send).toMatch(/new URL\(details\.url\)\.origin === origin/);
    // Set up before the window loads anything.
    expect(main.indexOf("sendLaunchSecret(origin)")).toBeLessThan(main.indexOf("win = new BrowserWindow"));
  });
});
