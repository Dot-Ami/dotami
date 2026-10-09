/**
 * [8i] The "Preparing DotAmi…" window (desktop/preparing.mjs; docs/architecture/expense-records.md § 10):
 * the first start of a new data folder waits about ten seconds for Windows' own key to reach the disk
 * before the receipts' key is saved (desktop/receipt-key.mjs waitForLocalState), and nothing was on the
 * screen meanwhile. The window shows only during that wait, closes when the main window shows, and is
 * closed before a failure message.
 *
 * The real window is made by desktop/main.mjs and checked in the real app (e2e-desktop/desktop.spec.ts);
 * here a stand-in window, and the same openReceiptKey the app calls, with the safeStorage stand-in of
 * tests/receipt-key.spec.ts reduced to what these tests need.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PREPARING_TITLE, preparingWindow, startWillWait, waitShowingWindow } from "../desktop/preparing.mjs";
import { openReceiptKey, type KeyStore } from "../desktop/receipt-key.mjs";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-preparing-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/** A key store that wraps by reversing the text: enough for opening and saving a key here. */
const store: KeyStore = {
  isEncryptionAvailable: () => true,
  encryptString: (text) => Buffer.from([...text].reverse().join(""), "utf8"),
  decryptString: (wrapped) => [...wrapped.toString("utf8")].reverse().join(""),
};

/** Chromium writing its own key into Local State, as it does about ten seconds after a first start. */
const writeLocalState = () => writeFileSync(path.join(dir, "Local State"), JSON.stringify({ os_crypt: { encrypted_key: "RFBBUEk..." } }));

/** A stand-in for the BrowserWindow, and the log, recording what happened in order. */
function standIn() {
  const events: string[] = [];
  let opened = 0;
  const window = {
    destroyed: false,
    isDestroyed() {
      return this.destroyed;
    },
    destroy() {
      events.push("window destroyed");
      this.destroyed = true;
    },
  };
  const preparing = preparingWindow(
    () => {
      opened += 1;
      events.push("window opened");
      return window;
    },
    { log: (line: string) => events.push(line) },
  );
  return { preparing, window, events, opened: () => opened };
}

describe("when the preparing window shows", () => {
  it("a first start on Windows: shown while Windows' own key is awaited, before the key is saved", async () => {
    const { preparing, events } = standIn();
    const result = await openReceiptKey(dir, store, {
      platform: "win32",
      keyStoreSaved: waitShowingWindow(dir, preparing, {
        platform: "win32",
        wait: async () => {
          // What the person sees during the wait: the window is up.
          events.push(`waiting, window ${preparing.isOpen() ? "open" : "not open"}`);
          writeLocalState();
          return true;
        },
      }),
    });
    expect(result).toMatchObject({ state: "on", made: true });
    expect(events).toEqual(["window opened", '[desktop] showing the "Preparing DotAmi…" window while Windows saves its own key', "waiting, window open"]);
  });

  it("an ordinary start (the key is there and opens): never shown", async () => {
    writeLocalState();
    await openReceiptKey(dir, store, { platform: "win32", keyStoreSaved: async () => true });
    const { preparing, opened } = standIn();
    const again = await openReceiptKey(dir, store, { platform: "win32", keyStoreSaved: waitShowingWindow(dir, preparing, { platform: "win32" }) });
    expect(again).toMatchObject({ state: "on", made: false });
    expect(opened()).toBe(0);
  });

  it("a new key in a folder whose Local State already holds Windows' key (after Start a new key): no wait, never shown", async () => {
    writeLocalState();
    const { preparing, opened } = standIn();
    const made = await openReceiptKey(dir, store, { platform: "win32", keyStoreSaved: waitShowingWindow(dir, preparing, { platform: "win32" }) });
    expect(made).toMatchObject({ state: "on", made: true });
    expect(opened()).toBe(0);
  });

  it("a Mac keeps its key at once, so it never waits and never shows it", async () => {
    expect(startWillWait(dir, "darwin")).toBe(false);
    expect(startWillWait(dir, "win32")).toBe(true);
    writeLocalState();
    expect(startWillWait(dir, "win32")).toBe(false);
  });

  it("is titled the way the person will read it", () => {
    expect(PREPARING_TITLE).toBe("Preparing DotAmi…");
    const page = readFileSync(path.join(__dirname, "..", "desktop", "preparing.html"), "utf8");
    expect(page).toContain(`<title>${PREPARING_TITLE}</title>`);
    // A local page that can load and reach nothing, and runs no script.
    expect(page).toContain(`content="default-src 'none'; style-src 'unsafe-inline'"`);
    expect(page).not.toMatch(/<script/i);
  });
});

describe("closing it", () => {
  it("closes once, whatever closes it first; shown again never, even if asked after", () => {
    const { preparing, events, opened } = standIn();
    preparing.show();
    preparing.close("the main window showed");
    preparing.close("start-up failed");
    preparing.show();
    expect(opened()).toBe(1);
    expect(preparing.isOpen()).toBe(false);
    expect(events.filter((e) => e === "window destroyed")).toHaveLength(1);
    expect(events.at(-1)).toBe("[desktop] the preparing window closed (the main window showed)");
  });

  it("a start that fails before any wait never shows it afterwards", () => {
    const { preparing, opened } = standIn();
    preparing.close("start-up failed");
    preparing.show();
    expect(opened()).toBe(0);
  });

  it("a window already gone is not destroyed twice", () => {
    const { preparing, window, events } = standIn();
    preparing.show();
    window.destroyed = true;
    preparing.close("start-up failed");
    expect(events).not.toContain("window destroyed");
  });
});

// desktop/main.mjs wires it: these read its source, a guard the real-app test (Windows only) backs up.
describe("how the desktop app uses it", () => {
  const main = readFileSync(path.join(__dirname, "..", "desktop", "main.mjs"), "utf8");
  const body = (name: string) => {
    const start = main.indexOf(`function ${name}(`);
    expect(start, `desktop/main.mjs has no function ${name}`).toBeGreaterThan(-1);
    return main.slice(start, main.indexOf("\n}\n", start));
  };

  it("closes it before the failure message, so it can't stay behind it, and still shows the message", () => {
    const fail = body("fail");
    expect(fail).toContain("preparing.close(");
    expect(fail).toContain("dialog.showErrorBox(");
    expect(fail.indexOf("preparing.close(")).toBeLessThan(fail.indexOf("dialog.showErrorBox("));
  });

  it("closes it in the same step that shows the main window, after showing it", () => {
    const start = body("start");
    const ready = start.slice(start.indexOf('win.once("ready-to-show"'));
    expect(ready.indexOf("win?.show()")).toBeGreaterThan(-1);
    expect(ready.indexOf("preparing.close(")).toBeGreaterThan(ready.indexOf("win?.show()"));
  });

  it("asks for it only around the wait for Windows' own key, when the receipts' key is opened", () => {
    expect(main).toMatch(/openReceiptKey\(dataDir, safeStorage, \{ keyStoreSaved: waitShowingWindow\(dataDir, preparing\) \}\)/);
  });
});
