// The port the desktop app asks for first, worked out from its data folder (2026-10-17).
//
// The window's pages are served from http://127.0.0.1:<port>, and a browser keeps localStorage per
// address *and port*. Until 2026-10-17 every launch asked the system for any free port, so every
// launch had a new address and found its browser storage empty: the cockpit's folds, the overlays
// last on and the first visit's tip put away (lib/cockpit/folds.ts) never lasted past one launch, and
// the calm first view's "a return visit opens the way you left it" never happened in the desktop app.
//
// So the app asks for the same port every time: one picked from the data folder's own path, which is
// the same on every launch and differs between data folders (two copies of DotAmi with their own
// folders, or the desktop tests' temporary ones, rarely collide). Nothing is written to remember it.
// When that port is taken, or Windows reserves it, desktop/main.mjs falls back to any free port, as
// before: the app always opens, and only that launch starts with empty browser storage.
//
// This changes nothing about who can reach the server: it still listens only on 127.0.0.1, every
// request still passes the Host check (middleware.ts), and cross-site writes are still refused
// (lib/api/body-limit.ts). A random port was never the guard; any page can try every local port.

import { createHash } from "node:crypto";
import path from "node:path";

/**
 * The ports the preferred one is picked from: 30000 to 39999, below the range Windows hands out for
 * outgoing connections (49152 and up) and above the common fixed ports of development servers.
 */
export const PREFERRED_PORT_LOW = 30_000;
export const PREFERRED_PORT_COUNT = 10_000;

/**
 * The port this data folder's app asks for first. Windows paths don't care about case, so the path is
 * lower-cased before it is hashed: `C:\Users\…\DotAmi` and `c:\users\…\dotami` are the same folder.
 */
export function preferredPort(dataDir) {
  const key = path.resolve(dataDir).toLowerCase();
  const n = createHash("sha256").update(key).digest().readUInt32BE(0);
  return PREFERRED_PORT_LOW + (n % PREFERRED_PORT_COUNT);
}
