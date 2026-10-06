import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { FOLDERS, SENT_ELSEWHERE, TABLES, WINDOW_STORAGE } from "@/lib/privacy/inventory";

import { readSource, simplify, sourceFiles } from "./helpers/source-scan";

/**
 * The /your-data page is drawn from lib/privacy/inventory.ts, so the page is only as honest as
 * that list is complete. These tests read the schema and the source and fail the moment something
 * is stored that the inventory doesn't name — which is what stops a new table, a new
 * browser-storage key or a new outgoing request from shipping without appearing on the page.
 */

const SCAN = ["app", "components", "lib"];
const files = sourceFiles(SCAN);

function schemaModels(): string[] {
  const schema = readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
}

describe("the privacy inventory lists every database table", () => {
  it("reads the schema (a guard against the scan silently finding nothing)", () => {
    expect(schemaModels()).toContain("Figure");
    expect(schemaModels().length).toBeGreaterThanOrEqual(6);
  });

  it("has an entry for every model in prisma/schema.prisma", () => {
    const listed = new Set(TABLES.map((t) => t.model));
    const missing = schemaModels().filter((m) => !listed.has(m));
    expect(missing, `add these to TABLES in lib/privacy/inventory.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("lists no table the schema doesn't have, and none twice", () => {
    const real = new Set(schemaModels());
    expect(TABLES.filter((t) => !real.has(t.model)).map((t) => t.model)).toEqual([]);
    expect(new Set(TABLES.map((t) => t.model)).size).toBe(TABLES.length);
  });

  it("says, for each one, what it holds and what takes a record out", () => {
    for (const t of TABLES) {
      expect(t.name.trim(), `${t.model} needs a name`).not.toBe("");
      expect(t.holds.trim(), `${t.model} needs to say what it holds`).not.toBe("");
      expect(t.removedBy.trim(), `${t.model} needs to say what removes it ("nothing" is an answer)`).not.toBe("");
    }
  });
});

describe("the privacy inventory lists every browser-storage key", () => {
  // The values of string constants, so `getItem(MY_KEY)` can be read as the key it stands for.
  const constants = new Map<string, string>();
  for (const f of files) {
    for (const m of simplify(readSource(f), true).matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])([^"'\n]*)\2/g)) {
      constants.set(m[1], m[3]);
    }
  }

  const used = new Map<string, string[]>(); // "store:key" -> the files that use it
  const unreadable: string[] = [];
  const otherUses: string[] = [];
  const otherStores: string[] = [];

  for (const f of files) {
    const code = simplify(readSource(f), true);
    for (const m of code.matchAll(/\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem)\s*\(\s*([^,)]*)/g)) {
      const arg = m[3].trim();
      const literal = arg.match(/^(["'`])([^"'`$]*)\1$/);
      const key = literal ? literal[2] : constants.get(arg);
      if (key === undefined) {
        unreadable.push(`${f}: ${m[1]}.${m[2]}(${arg})`);
        continue;
      }
      const id = `${m[1]}:${key}`;
      used.set(id, [...(used.get(id) ?? []), f]);
    }

    // Anything else done with the storage objects (clear(), key(), bracket access, handing the
    // object to another function) could touch keys this scan can't name, so it is refused outright.
    const plain = simplify(readSource(f), false);
    for (const m of plain.matchAll(/\b(localStorage|sessionStorage)\b/g)) {
      const after = plain.slice(m.index! + m[0].length);
      if (!/^\s*\.\s*(getItem|setItem|removeItem)\s*\(/.test(after)) otherUses.push(`${f}: ${m[0]}`);
    }
    // Other places a window can keep things.
    for (const m of plain.matchAll(/\b(indexedDB|cookieStore|openDatabase)\b|document\s*\.\s*cookie|\bcaches\s*\./g)) {
      otherStores.push(`${f}: ${m[0]}`);
    }
  }

  it("sees the keys DotAmi uses today (a guard against the scan silently finding nothing)", () => {
    expect([...used.keys()]).toEqual(
      expect.arrayContaining([
        "localStorage:dotami-employment-suggestions",
        "sessionStorage:dotami-journey-v3",
        "sessionStorage:dotami-person-unsaved",
      ]),
    );
  });

  it("has an entry for every key the code reads or writes", () => {
    const listed = new Set(WINDOW_STORAGE.map((w) => `${w.store}:${w.key}`));
    const missing = [...used.keys()].filter((k) => !listed.has(k));
    expect(missing, `add these to WINDOW_STORAGE in lib/privacy/inventory.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("lists no key the code never uses (a renamed key would leave a stale line)", () => {
    const stale = WINDOW_STORAGE.map((w) => `${w.store}:${w.key}`).filter((k) => !used.has(k));
    expect(stale).toEqual([]);
  });

  it("can name every key: each one is a string written out or a constant, never built at run time", () => {
    expect(unreadable, "use a string constant for the key so the inventory can list it").toEqual([]);
  });

  it("finds no use of the storage objects it can't account for", () => {
    expect(otherUses).toEqual([]);
  });

  it("finds no other kind of browser storage (cookies, IndexedDB, the cache)", () => {
    expect(otherStores, "add a kind of entry for it to lib/privacy/inventory.ts, and extend this scan").toEqual([]);
  });

  it("says what each holds and how long it lasts", () => {
    for (const w of WINDOW_STORAGE) {
      expect(w.name.trim()).not.toBe("");
      expect(w.holds.trim()).not.toBe("");
      expect(w.lasts.trim()).not.toBe("");
    }
  });
});

describe("the privacy inventory lists what the desktop app writes beside the data file", () => {
  it.each(FOLDERS)("$name is still written by $writtenBy.file", (folder) => {
    const text = readFileSync(path.join(process.cwd(), folder.writtenBy.file), "utf8");
    expect(text, `${folder.writtenBy.file} no longer mentions ${folder.writtenBy.mentions}; was it renamed?`).toContain(
      folder.writtenBy.mentions,
    );
  });
});

describe("the privacy inventory lists what can leave this computer", () => {
  // Where the app's own code talks to anything outside this computer. Each place must be one the
  // inventory describes, so a new request out can't be added without the page saying so.
  const sdkUsers: string[] = [];
  const outgoing: string[] = [];
  for (const f of files) {
    const code = simplify(readSource(f), true);
    if (/from\s+["']@anthropic-ai\/sdk["']/.test(code)) sdkUsers.push(f);
    for (const m of code.matchAll(
      /\bfetch\s*\(\s*["'`]https?:|from\s+["'](?:node:)?https?["']|\bXMLHttpRequest\b|\bnew\s+WebSocket\b|\bnew\s+EventSource\b|\bsendBeacon\b/g,
    )) {
      outgoing.push(`${f}: ${m[0]}`);
    }
  }

  it("knows the only code that reaches Anthropic: the intake's sentence reader", () => {
    expect(sdkUsers).toEqual(["app/api/intent/parse/route.ts"]);
    expect(SENT_ELSEWHERE.map((s) => s.id)).toContain("intake-sentence");
  });

  it("finds no other request leaving this computer from the app's own code", () => {
    expect(outgoing, "describe it in SENT_ELSEWHERE (lib/privacy/inventory.ts), then allow it here").toEqual([]);
  });

  it("still has the update check it describes (the installed app asks GitHub at start)", () => {
    const main = readFileSync(path.join(process.cwd(), "desktop", "main.mjs"), "utf8");
    expect(main).toContain("electron-updater");
    expect(SENT_ELSEWHERE.map((s) => s.id)).toContain("update-check");
  });

  it("says what is sent, when, and whether it can be taken back", () => {
    for (const s of SENT_ELSEWHERE) {
      expect(s.name.trim()).not.toBe("");
      expect(s.when.trim()).not.toBe("");
      expect(s.what.trim()).not.toBe("");
      expect(s.canTakeBack.trim()).not.toBe("");
    }
  });
});
