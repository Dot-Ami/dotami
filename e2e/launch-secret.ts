import { LAUNCH_SECRET_ENV, LAUNCH_SECRET_HEADER } from "../lib/http/launch-secret";

/**
 * The header DotAmi's window sends (lib/http/launch-secret.ts), for the browser tests. playwright.config.ts
 * makes one secret per run and hands it to the test server; every test's browser sends it through
 * `extraHTTPHeaders`. A test that sets its own `extraHTTPHeaders` (which replaces the config's) or opens
 * its own browser context spreads this in, or the server refuses it.
 */
export function launchSecretHeaders(): Record<string, string> {
  const secret = process.env[LAUNCH_SECRET_ENV];
  return secret ? { [LAUNCH_SECRET_HEADER]: secret } : {};
}
