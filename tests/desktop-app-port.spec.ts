/**
 * The desktop app's port (desktop/app-port.mjs, 2026-10-17): the same data folder asks for the same port
 * on every launch, so the window's address and its browser storage (the cockpit's folds, overlays and the
 * first visit's tip put away, lib/cockpit/folds.ts) last from one launch to the next. The fallback to any
 * free port when that one is taken is in desktop/main.mjs and is tested by e2e-desktop/desktop.spec.ts.
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PREFERRED_PORT_COUNT, PREFERRED_PORT_LOW, preferredPort } from "../desktop/app-port.mjs";

describe("the desktop app's preferred port", () => {
  const folder = path.join("C:", "Users", "someone", "AppData", "Roaming", "DotAmi");

  it("is the same for the same data folder every time, whatever the case of its path", () => {
    expect(preferredPort(folder)).toBe(preferredPort(folder));
    expect(preferredPort(folder.toUpperCase())).toBe(preferredPort(folder));
    expect(preferredPort(folder.toLowerCase())).toBe(preferredPort(folder));
  });

  it("is inside its range, never a port the system hands out for outgoing connections", () => {
    for (let i = 0; i < 500; i += 1) {
      const port = preferredPort(path.join(folder, `copy-${i}`));
      expect(port).toBeGreaterThanOrEqual(PREFERRED_PORT_LOW);
      expect(port).toBeLessThan(PREFERRED_PORT_LOW + PREFERRED_PORT_COUNT);
      expect(port).toBeLessThan(49_152);
    }
  });

  it("differs between data folders (two copies of DotAmi rarely ask for the same one)", () => {
    const ports = new Set(Array.from({ length: 200 }, (_, i) => preferredPort(path.join(folder, `copy-${i}`))));
    // 200 folders over 10,000 ports: a handful may share one, most don't.
    expect(ports.size).toBeGreaterThan(190);
  });
});
