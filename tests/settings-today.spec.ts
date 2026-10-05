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

  it("reports the version from package.json", () => {
    expect(readSettingsToday({}, cwd).version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
