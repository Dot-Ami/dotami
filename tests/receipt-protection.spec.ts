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

  /** A folder as the desktop app lists it, nothing counted: each case names only what it holds. */
  const listed = { receipts: 0, canBringBack: 0, noKey: 0, noRecord: 0, alreadyBack: 0, changed: 0, unreadable: 0, keyFile: true, deleteOwed: false };
  const at = (counts: Partial<typeof listed>) => setAsideFolderText({ ...listed, path: folder, ...counts });

  it("says, for each set-aside folder, how many receipts it holds and whether their old key opens again", () => {
    expect(at({ receipts: 2, canBringBack: 2 })).toEqual({
      summary: `2 receipt files set aside in ${folder}. This Windows account can open their old key again.`,
      canBringBack: true,
    });
    expect(at({ receipts: 3, canBringBack: 1, noKey: 2 })).toEqual({
      summary: `3 receipt files set aside in ${folder}. 1 of them can be brought back now. 2 of them are locked with an old key this Windows account still can't open.`,
      canBringBack: true,
    });
    expect(at({ receipts: 1, noKey: 1 })).toEqual({
      summary: `1 receipt file set aside in ${folder}. Their old key still can't be opened on this Windows account, so they can't be brought back.`,
      canBringBack: false,
    });
  });

  it("fix round: offers the button only for receipts that could come back, and says why each of the others can't", () => {
    expect(at({ receipts: 1, noRecord: 1 })).toEqual({
      summary: `1 receipt file set aside in ${folder}. 1 of them can't come back: its expense record was deleted, or no longer has that receipt. Delete (“Safety copies in the backups folder”) on What DotAmi knows about you can clear this folder.`,
      canBringBack: false,
    });
    expect(at({ receipts: 2, alreadyBack: 2 })).toEqual({
      summary: `2 receipt files set aside in ${folder}. 2 of them are already back in the receipts folder; the copies here are old ones. Delete (“Safety copies in the backups folder”) on What DotAmi knows about you can clear this folder.`,
      canBringBack: false,
    });
    expect(at({ receipts: 1, changed: 1 })).toEqual({
      summary: `1 receipt file set aside in ${folder}. 1 of them changed or was damaged since it was set aside, so DotAmi won't bring it back. Delete (“Safety copies in the backups folder”) on What DotAmi knows about you can clear this folder.`,
      canBringBack: false,
    });
    // Something that may still come back (held open now) means Delete isn't suggested.
    expect(at({ receipts: 2, noRecord: 1, unreadable: 1 })).toEqual({
      summary: `2 receipt files set aside in ${folder}. 1 of them can't come back: its expense record was deleted, or no longer has that receipt. 1 of them couldn't be read just now (another program may have it open). Reload this page to check again.`,
      canBringBack: false,
    });
    expect(at({ receipts: 3, canBringBack: 2, noRecord: 1 }).canBringBack).toBe(true);
  });

  it("fix round: a folder with no key file of its own says where a found receipts.key goes", () => {
    expect(at({ receipts: 1, noKey: 1, keyFile: false })).toEqual({
      summary: `1 receipt file set aside in ${folder}. Their old key file isn't in this folder, so they can't be brought back. If you find the old receipts.key (it may be in the Recycle Bin), put it in this folder and reload this page.`,
      canBringBack: false,
    });
    expect(at({ receipts: 2, canBringBack: 1, noKey: 1, keyFile: false }).summary).toContain(
      "1 of them is locked with an old key whose file isn't in this folder. If you find the old receipts.key (it may be in the Recycle Bin), put it in this folder and reload this page.",
    );
  });

  it("fix round: a folder an earlier Delete still owes is never offered", () => {
    expect(at({ receipts: 1, deleteOwed: true })).toEqual({
      summary: `Receipts set aside in ${folder} are being cleared by an earlier Delete that hasn't finished, so they can't be brought back. What DotAmi knows about you can finish it (Finish it now).`,
      canBringBack: false,
    });
  });

  it("says plainly when this copy can't bring them back at all", () => {
    expect(SET_ASIDE_FROM_SOURCE).toContain("has no key store");
    expect(SET_ASIDE_FROM_SOURCE).toContain("The desktop app can");
    expect(SET_ASIDE_NEEDS_OPEN_KEY).toContain("only while DotAmi's own receipts key opens");
  });

  it("has a plain sentence for every reason a receipt stays, and every reason the desktop app refuses", () => {
    for (const why of ["no-key", "no-record", "changed", "already-there", "not-written", "in-use"] as const) expect(BRING_BACK_LEFT[why]).toMatch(/^[A-Z].+\.$/);
    for (const reason of ["not-dotami-window", "no-current-key", "closing", "not-a-set-aside-folder", "data-file-unreadable", "delete-owed"] as const) {
      expect(BRING_BACK_REFUSED[reason]).toMatch(/Nothing was moved\.$/);
    }
    expect(BRING_BACK_LEFT["no-record"]).toContain("deleted since");
    expect(BRING_BACK_LEFT["in-use"]).toBe("Another program had it open, so it couldn't be read. Try again.");
    expect(BRING_BACK_REFUSED["delete-owed"]).toBe("An earlier Delete is still clearing that folder, so its receipts can't be brought back. Nothing was moved.");
  });

  it("fix round: no answer at all doesn't claim nothing moved (the page can't know), and says how to see what is left", () => {
    expect(BRING_BACK_REFUSED["no-answer"]).toBe("The desktop app didn't answer. Reload this page to see which receipts are still set aside.");
    expect(BRING_BACK_REFUSED["no-answer"]).not.toContain("Nothing was moved");
  });

  it("counts what came back, and says when an old copy is still in the folder", () => {
    expect(bringBackDoneText({ broughtBack: ["a.png"], oldCopiesLeft: [], left: [] })).toBe("1 receipt brought back. It opens from its record again.");
    expect(bringBackDoneText({ broughtBack: ["a.png", "b.pdf"], oldCopiesLeft: ["b.pdf"], left: [] })).toBe(
      "2 receipts brought back. They open from their records again. The old copy of 1 is still in the set-aside folder, because another program had it open.",
    );
    expect(bringBackDoneText({ broughtBack: [], oldCopiesLeft: [], left: [{ name: "a.png", why: "no-key" }] })).toBe("No receipt was brought back.");
  });
});
