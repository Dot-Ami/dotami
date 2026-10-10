import path from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_INTENT_ANTHROPIC_MODEL } from "@/lib/providers/llm/constants";
import { databaseFilePath, readSettingsToday } from "@/lib/settings/today";

const cwd = path.resolve("/srv/dotami");

describe("databaseFilePath", () => {
  it("reads a relative SQLite path from prisma/, the way Prisma does", () => {
    expect(databaseFilePath("file:./dotami.db", cwd)).toBe(path.join(cwd, "prisma", "dotami.db"));
  });

  it("keeps an absolute path as it is (the desktop app's data folder)", () => {
    const abs = path.resolve("/data/DotAmi/dotami.db");
    expect(databaseFilePath(`file:${abs}`, cwd)).toBe(abs);
  });

  it("drops connection options after the question mark", () => {
    expect(databaseFilePath("file:./dotami.db?connection_limit=1", cwd)).toBe(path.join(cwd, "prisma", "dotami.db"));
  });

  it("returns null for anything that isn't a SQLite file", () => {
    expect(databaseFilePath(undefined, cwd)).toBeNull();
    expect(databaseFilePath("", cwd)).toBeNull();
    expect(databaseFilePath("file:", cwd)).toBeNull();
    expect(databaseFilePath("postgresql://localhost:5432/dotami", cwd)).toBeNull();
  });
});

describe("readSettingsToday", () => {
  it("says nothing is sent when no model key is set", () => {
    const today = readSettingsToday({ DATABASE_URL: "file:./none.db", ANTHROPIC_API_KEY: "" }, cwd);
    expect(today.intake).toEqual({ sentTo: "nobody", model: null });
  });

  it("says the sentence goes to Anthropic when any key is set — the parser's own test", () => {
    const today = readSettingsToday({ ANTHROPIC_API_KEY: "sk-placeholder" }, cwd);
    expect(today.intake).toEqual({ sentTo: "anthropic", model: DEFAULT_INTENT_ANTHROPIC_MODEL });
  });

  it("never carries the key itself", () => {
    const today = readSettingsToday({ ANTHROPIC_API_KEY: "sk-placeholder" }, cwd);
    expect(JSON.stringify(today)).not.toContain("sk-placeholder");
  });

  it("reports a data file that isn't there as missing, not as present", () => {
    const today = readSettingsToday({ DATABASE_URL: "file:./does-not-exist.db" }, cwd);
    expect(today.dataFile).toEqual({ path: path.join(cwd, "prisma", "does-not-exist.db"), exists: false });
  });

  it("says the copy checks GitHub for updates only when the installed app says so", () => {
    expect(readSettingsToday({ DOTAMI_UPDATES: "github" }, cwd).updates).toBe("github");
    expect(readSettingsToday({}, cwd).updates).toBe("manual");
    expect(readSettingsToday({ DOTAMI_UPDATES: "yes" }, cwd).updates).toBe("manual");
  });

  it("knows it's the desktop app only when the desktop app says so", () => {
    expect(readSettingsToday({ DOTAMI_DESKTOP: "1" }, cwd).desktop).toBe(true);
    expect(readSettingsToday({}, cwd).desktop).toBe(false);
  });

  it("says whether receipts are encrypted only from what the desktop app passed, and never carries the key ([8i])", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const on = readSettingsToday({ DOTAMI_RECEIPT_LOCK: "on", DOTAMI_RECEIPT_KEY: key }, cwd);
    expect(on.receipts).toBe("on");
    expect(JSON.stringify(on)).not.toContain(key);
    // A copy run from source passes nothing: its receipts are not encrypted, and the page says so.
    expect(readSettingsToday({}, cwd).receipts).toBe("source");
    expect(readSettingsToday({ DOTAMI_RECEIPT_LOCK: "no-key-store" }, cwd).receipts).toBe("no-key-store");
    expect(readSettingsToday({ DOTAMI_RECEIPT_LOCK: "key-unreadable" }, cwd).receipts).toBe("key-unreadable");
    // "on" without a usable key is not "on": nothing may claim encryption that isn't there.
    expect(readSettingsToday({ DOTAMI_RECEIPT_LOCK: "key-out-of-reach" }, cwd).receipts).toBe("key-out-of-reach");
    // ... nor "key-unreadable", which offers Start a new key: a key that isn't one is out of reach.
    expect(readSettingsToday({ DOTAMI_RECEIPT_LOCK: "on" }, cwd).receipts).toBe("key-out-of-reach");
  });

  it("reports the version from package.json", () => {
    expect(readSettingsToday({}, cwd).version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
