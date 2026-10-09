/**
 * [8i] What Settings and "What DotAmi knows about you" say the receipt encryption protects
 * (lib/expenses/receipts/protection.ts; expense-records.md § 9, "What it protects"). Said precisely: on
 * Windows another standard account is already kept out of the person's data folder by its folder
 * permissions, so the encryption's gain is against an administrator account, a copy of the folder and a
 * disk read outside Windows. The page must not claim it protects from "another account" in general.
 */
import { describe, expect, it } from "vitest";

import { receiptProtectionText } from "@/lib/expenses/receipts/protection";

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
