/**
 * [8i] What Settings and "What DotAmi knows about you" say the receipt encryption protects
 * (lib/expenses/receipts/protection.ts; expense-records.md § 9, "What it protects"). Said precisely: on
 * Windows another standard account is already kept out of the person's data folder by its folder
 * permissions, so the encryption's gain is against an administrator account, a copy of the folder and a
 * disk read outside Windows. The page must not claim it protects from "another account" in general.
 */
import { describe, expect, it } from "vitest";

import { receiptProtectionText, receiptsCanBeAdded } from "@/lib/expenses/receipts/protection";

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
