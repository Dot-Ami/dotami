/**
 * [8i] What the server is told about the data file (lib/db/lock.ts) and what the pages then say
 * (lib/db/protection.ts): the key only when the file is encrypted, taken out of the environment once
 * read; "encrypted" said only when the desktop app opened the file with its key; and every state said
 * plainly, with what losing the key costs.
 */
import { afterEach, describe, expect, it } from "vitest";

import { __resetDatabaseLockForTests, databaseKey, databaseLock, readDatabaseLock } from "@/lib/db/lock";
import { databaseProtectionText, DATABASE_KEY_LOSS_SENTENCE, OLDER_VERSION_SENTENCE } from "@/lib/db/protection";
import { receiptProtectionText } from "@/lib/expenses/receipts/protection";

const KEY = Buffer.alloc(32, 7);

afterEach(() => {
  delete process.env.DOTAMI_DATABASE_LOCK;
  delete process.env.DOTAMI_DATABASE_KEY;
  delete process.env.DOTAMI_DATABASE_PLAIN_LEFT;
  __resetDatabaseLockForTests();
});

describe("the lock the desktop app hands its server", () => {
  it("reads each state; a copy run from source is 'source'", () => {
    expect(readDatabaseLock({})).toEqual({ state: "source", plainLeft: 0 });
    expect(readDatabaseLock({ DOTAMI_DATABASE_LOCK: "off" })).toEqual({ state: "off", plainLeft: 0 });
    expect(readDatabaseLock({ DOTAMI_DATABASE_LOCK: "never", DOTAMI_DATABASE_PLAIN_LEFT: "2" })).toEqual({ state: "never", plainLeft: 2 });
    expect(readDatabaseLock({ DOTAMI_DATABASE_LOCK: "no-key-store" })).toEqual({ state: "no-key-store", plainLeft: 0 });
    expect(readDatabaseLock({ DOTAMI_DATABASE_LOCK: "on", DOTAMI_DATABASE_KEY: KEY.toString("base64"), DOTAMI_DATABASE_PLAIN_LEFT: "1" })).toEqual({
      state: "on",
      key: KEY,
      plainLeft: 1,
    });
    // A count that isn't a whole number is no count; a state DotAmi doesn't set is "source".
    expect(readDatabaseLock({ DOTAMI_DATABASE_LOCK: "off", DOTAMI_DATABASE_PLAIN_LEFT: "x" }).plainLeft).toBe(0);
    expect(readDatabaseLock({ DOTAMI_DATABASE_LOCK: "maybe" }).state).toBe("source");
  });

  it("a key that isn't 32 bytes opens nothing, rather than the file being read as plain", () => {
    const lock = readDatabaseLock({ DOTAMI_DATABASE_LOCK: "on", DOTAMI_DATABASE_KEY: "c2hvcnQ=" });
    expect(lock).toMatchObject({ state: "on" });
    expect(lock.state === "on" && lock.key).toEqual(Buffer.alloc(32));
  });

  it("takes the key out of the environment the first time it reads it", () => {
    process.env.DOTAMI_DATABASE_LOCK = "on";
    process.env.DOTAMI_DATABASE_KEY = KEY.toString("base64");
    expect(databaseKey()).toEqual(KEY);
    expect(process.env.DOTAMI_DATABASE_KEY).toBeUndefined();
    expect(databaseLock().state).toBe("on");
    expect(databaseKey()).toEqual(KEY);
  });

  it("has no key for any state but 'on'", () => {
    process.env.DOTAMI_DATABASE_LOCK = "never";
    process.env.DOTAMI_DATABASE_KEY = KEY.toString("base64");
    expect(databaseKey()).toBeNull();
  });
});

describe("what the pages say", () => {
  it("says 'encrypted' only for 'on', with what it protects, what it doesn't, and what a lost key costs", () => {
    const on = databaseProtectionText("on");
    expect(on).toMatchObject({ headline: "Your data file is encrypted on this computer.", tone: "ok" });
    expect(on.detail).toContain("Windows already keeps other standard accounts on this computer out of your data folder");
    expect(on.detail).toContain("Anything running as you can still open it");
    expect(on.detail).toContain(DATABASE_KEY_LOSS_SENTENCE);
    expect(on.detail).toContain(OLDER_VERSION_SENTENCE);
    for (const state of ["source", "off", "never", "no-key-store"] as const) {
      const text = databaseProtectionText(state);
      expect(text.tone, state).toBe("plain");
      expect(text.headline, state).toMatch(/isn't encrypted/);
    }
  });

  it("says when plain copies are still on the disk", () => {
    expect(databaseProtectionText("on", 0).detail).not.toContain("plain cop");
    expect(databaseProtectionText("on", 1).detail).toContain("One plain copy of your data is still on this computer");
    expect(databaseProtectionText("on", 3).detail).toContain("3 plain copies of your data are still on this computer");
  });

  it("the receipts' line no longer says the data file isn't encrypted once it is", () => {
    expect(receiptProtectionText("on").detail).toContain("The data file itself isn't encrypted");
    const both = receiptProtectionText("on", null, { dataFileEncrypted: true }).detail;
    expect(both).not.toContain("isn't encrypted");
    expect(both).toContain("is encrypted too, with a key of its own");
  });
});
