/**
 * [8i] What Settings and "What DotAmi knows about you" say the receipt encryption protects
 * (lib/expenses/receipts/protection.ts; expense-records.md § 9, "What it protects"). Said precisely: on
 * Windows another standard account is already kept out of the person's data folder by its folder
 * permissions, so the encryption's gain is against an administrator account, a copy of the folder and a
 * disk read outside Windows. The page must not claim it protects from "another account" in general.
 */
import { describe, expect, it } from "vitest";

import {
  BRING_BACK_LEFT,
  BRING_BACK_REFUSED,
  bringBackDoneText,
  receiptProtectionText,
  receiptsCanBeAdded,
  SET_ASIDE_FROM_SOURCE,
  SET_ASIDE_NEEDS_OPEN_KEY,
  setAsideFolderText,
} from "@/lib/expenses/receipts/protection";

describe("what the encryption is said to protect", () => {
  const { headline, detail, tone } = receiptProtectionText("on");

  it("says other standard accounts are kept out by Windows already, and names what the encryption adds", () => {
    expect(headline).toBe("Your receipt files are encrypted on this computer.");
    expect(tone).toBe("ok");
    expect(detail).toContain("Windows already keeps other standard accounts on this computer out of your data folder");
    expect(detail).toContain("an administrator account, a copy of this data folder, or the disk read outside Windows can't read them either");
  });

  it("never claims the encryption protects from another account in general", () => {
    expect(detail).not.toMatch(/so another account/i);
    expect(detail).not.toMatch(/another account[^.]*can't read/i);
  });

  it("still says what it doesn't protect from: anything running as the person, an administrator's program run as them, the data file", () => {
    expect(detail).toContain("Anything running as you can still open them, as DotAmi does, and so can a program an administrator runs as you.");
    expect(detail).toContain("The data file itself isn't encrypted");
  });
});

// [8i] While the key is out of reach only for now (the key store unavailable, or a new key not saved
// yet), Start a new key isn't offered: the key may open again at the next start (expense-records.md § 10).
describe("the key out of reach for now", () => {
  const { headline, detail, tone } = receiptProtectionText("key-out-of-reach");

  it("says so in amber, says nothing was changed, and that DotAmi tries again at its next start", () => {
    expect(tone).toBe("problem");
    expect(headline).toBe("DotAmi can't open the key to your receipts right now.");
    expect(detail).toContain("Nothing was changed or deleted.");
    expect(detail).toContain("DotAmi tries again each time it starts");
  });

  it("never points to Start a new key, which isn't offered then", () => {
    expect(detail).not.toMatch(/start a new key/i);
  });
});

// Add a receipt is offered only when a receipt can be added: never while the key can't be opened, is out
// of reach, or until the restart after Start a new key (the server refuses then too, lib/expenses/receipts/store.ts).
describe("when Add a receipt is offered", () => {
  it("only while a receipt can be kept", () => {
    expect(receiptsCanBeAdded("on")).toBe(true);
    expect(receiptsCanBeAdded("source")).toBe(true);
    expect(receiptsCanBeAdded("no-key-store")).toBe(true);
    expect(receiptsCanBeAdded("key-unreadable")).toBe(false);
    expect(receiptsCanBeAdded("key-out-of-reach")).toBe(false);
    expect(receiptsCanBeAdded("new-key-at-restart")).toBe(false);
  });
});

describe("after Start a new key, until the restart (expense-records.md § 11)", () => {
  const folder = "/home/someone/DotAmi/backups/receipts-locked-1760000000000";

  it("in the desktop app: says DotAmi restarts by itself, and to close it and open it again if it hasn't", () => {
    const { headline, detail, tone } = receiptProtectionText("new-key-at-restart", folder, { desktop: true });
    expect(tone).toBe("problem");
    expect(headline).toBe("DotAmi starts a new key for your receipts the next time it starts.");
    expect(detail).toContain(folder);
    expect(detail).toContain("DotAmi restarts by itself to start it. If it hasn't, close DotAmi and open it again.");
    expect(detail).not.toContain("doesn't restart by itself");
  });

  it("in a copy run from source: says plainly that it doesn't restart by itself, and to restart it by hand", () => {
    for (const { detail } of [receiptProtectionText("new-key-at-restart", folder), receiptProtectionText("new-key-at-restart", folder, { desktop: false })]) {
      expect(detail).toContain("This copy doesn't restart by itself: stop it and start it again to start the new key.");
      expect(detail).not.toContain("restarts by itself to start it");
    }
  });
});

describe("bringing set-aside receipts back (expense-records.md § 12)", () => {
  const folder = "/home/someone/DotAmi/backups/receipts-locked-1760000000000";

  it("says, for each set-aside folder, how many receipts it holds and whether their old key opens again", () => {
    expect(setAsideFolderText({ path: folder, receipts: 2, canOpen: 2 })).toEqual({
      summary: `2 receipt files set aside in ${folder}. This Windows account can open their old key again.`,
      canBringBack: true,
    });
    expect(setAsideFolderText({ path: folder, receipts: 3, canOpen: 1 })).toEqual({
      summary: `3 receipt files set aside in ${folder}. This Windows account can open the old key to 1 of them again; the others stay where they are.`,
      canBringBack: true,
    });
    expect(setAsideFolderText({ path: folder, receipts: 1, canOpen: 0 })).toEqual({
      summary: `1 receipt file set aside in ${folder}. Their old key still can't be opened on this Windows account, so they can't be brought back.`,
      canBringBack: false,
    });
  });

  it("says plainly when this copy can't bring them back at all", () => {
    expect(SET_ASIDE_FROM_SOURCE).toContain("has no key store");
    expect(SET_ASIDE_FROM_SOURCE).toContain("The desktop app can");
    expect(SET_ASIDE_NEEDS_OPEN_KEY).toContain("only while DotAmi's own receipts key opens");
  });

  it("has a plain sentence for every reason a receipt stays, and every reason the desktop app refuses", () => {
    for (const why of ["no-key", "no-record", "changed", "already-there", "not-written"] as const) expect(BRING_BACK_LEFT[why]).toMatch(/^[A-Z].+\.$/);
    for (const reason of ["not-dotami-window", "no-current-key", "closing", "not-a-set-aside-folder", "data-file-unreadable"] as const) {
      expect(BRING_BACK_REFUSED[reason]).toMatch(/Nothing was moved\.$/);
    }
    expect(BRING_BACK_LEFT["no-record"]).toContain("deleted since");
  });

  it("counts what came back, and says when an old copy is still in the folder", () => {
    expect(bringBackDoneText({ broughtBack: ["a.png"], oldCopiesLeft: [], left: [] })).toBe("1 receipt brought back. It opens from its record again.");
    expect(bringBackDoneText({ broughtBack: ["a.png", "b.pdf"], oldCopiesLeft: ["b.pdf"], left: [] })).toBe(
      "2 receipts brought back. They open from their records again. The old copy of 1 is still in the set-aside folder, because another program had it open.",
    );
    expect(bringBackDoneText({ broughtBack: [], oldCopiesLeft: [], left: [{ name: "a.png", why: "no-key" }] })).toBe("No receipt was brought back.");
  });
});
