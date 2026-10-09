/**
 * [8g] The bank and card accounts list and the "Bank and card records" setting: the name rule
 * (the maintainer's decision, 2026-10-07: "ending" plus four digits at the end, no other run of
 * four or more digits), the three warning buttons, taking an account or "every account" back, the
 * switch that must be on before an account can be added (still planned, so off), and the routes,
 * which answer only DotAmi's own page.
 *
 * The database tests run on throwaway migrated SQLite files, through Prisma, like
 * tests/privacy-delete.spec.ts. Every account name and number here is invented.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { localDay } from "@/lib/figures/age";
import {
  DIGITS_REFUSED,
  MAX_ACCOUNT_NAME_LENGTH,
  checkAccountName,
  describeAllowance,
  needsWarning,
  sameAccountName,
} from "@/lib/figures/source-account-name";
import {
  AccountInputError,
  AccountNotFoundError,
  BankRecordsOffError,
  MAX_LIVE_ACCOUNTS,
  allowAccount,
  bankRecordsBuilt,
  readBankRecords,
  readBankSources,
  retireAccount,
  takeBackEveryAccount,
} from "@/lib/figures/source-accounts";
import { BANK_STATEMENT_WARNING, SETTINGS } from "@/lib/settings/catalog";
import { BANK_RECORDS_DEFINITION, SETTING_DEFINITIONS, readStoredWith } from "@/lib/settings/values";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

/** An invented account number. It must never be stored, answered or logged. */
const ACCOUNT_DIGITS = "004512345678";

// ---------------------------------------------------------------------------------------------
// The name rule

describe("an account's name: 'ending' plus four digits at the end, no other run of four digits", () => {
  it.each([
    ["Business chequing", "Business chequing"],
    ["Visa ending 1234", "Visa ending 1234"],
    ["  Visa   ENDING 1234 ", "Visa ENDING 1234"],
    ["Mastercard Ending 0042", "Mastercard Ending 0042"],
    ["Line of credit 2", "Line of credit 2"],
    ["TD 123", "TD 123"],
    ["Savings 1 2 3", "Savings 1 2 3"],
    ["ending 1234", "ending 1234"],
    ["Compte d'épargne", "Compte d'épargne"],
  ])("accepts %j as %j", (raw, stored) => {
    expect(checkAccountName(raw)).toEqual({ ok: true, name: stored });
  });

  it.each([
    ["the number itself", ACCOUNT_DIGITS],
    ["the number after a word", `Chequing ${ACCOUNT_DIGITS}`],
    ["four digits not after 'ending'", "Visa 1234"],
    ["four digits not at the end", "Visa ending 1234 business"],
    ["five digits after 'ending'", "Visa ending 12345"],
    ["three digits after 'ending', then more", "Visa ending 123 4"],
    ["a second run before the allowed ending", "Visa 4510 ending 1234"],
    ["'ending' inside another word", "Spending 1234"],
    ["no space before 'ending'", "Card12ending 1234"],
    ["a card number in groups", "Card 4510 0000 0000 1234"],
    ["digits split by spaces", "Chequing 12 34 56"],
    ["digits split by hyphens", "Chequing 004-12345-678"],
    ["digits split by dots", "Account 1.2.3.4"],
    ["digits split by slashes", "Account 12/34/56"],
    ["full-width digits", "Chequing \uFF14\uFF15\uFF11\uFF10"],
    ["Arabic-Indic digits", "Chequing \u0664\u0665\u0661\u0660"],
    ["a year, which reads like four digits", "Business 2026"],
  ])("refuses %s", (_why, raw) => {
    expect(checkAccountName(raw)).toEqual({ ok: false, reason: DIGITS_REFUSED });
  });

  it("refuses hidden characters, which could split a number so the check above misses it", () => {
    expect(checkAccountName("Chequing 1\u200B2\u200B3\u200B4").ok).toBe(false);
    expect(checkAccountName("Chequing\n1234").ok).toBe(false);
    expect(checkAccountName("Chequing\u00AD").ok).toBe(false);
  });

  it("refuses an empty name, a name that is too long, and anything that isn't text", () => {
    expect(checkAccountName("   ").ok).toBe(false);
    expect(checkAccountName(42).ok).toBe(false);
    expect(checkAccountName(null).ok).toBe(false);
    expect(checkAccountName("a".repeat(MAX_ACCOUNT_NAME_LENGTH)).ok).toBe(true);
    expect(checkAccountName("a".repeat(MAX_ACCOUNT_NAME_LENGTH + 1))).toEqual({
      ok: false,
      reason: `Keep the name to ${MAX_ACCOUNT_NAME_LENGTH} characters or fewer.`,
    });
  });

  it("treats names that differ only in case or spaces as the same account", () => {
    expect(sameAccountName("Visa ending 1234", " visa  ENDING 1234")).toBe(true);
    expect(sameAccountName("Visa ending 1234", "Visa ending 1235")).toBe(false);
  });
});

describe("when a statement needs the warning", () => {
  it("always for a new account, and for one allowed once or allowed through 'every account'", () => {
    expect(needsWarning(null, null)).toBe(true);
    expect(needsWarning({ allowance: "once" }, null)).toBe(true);
    expect(needsWarning({ allowance: "every" }, null)).toBe(true);
  });

  it("never for an account always allowed, and never for any account while every account is allowed", () => {
    expect(needsWarning({ allowance: "always" }, null)).toBe(false);
    expect(needsWarning(null, "2026-10-08T15:00:00.000Z")).toBe(false);
    expect(needsWarning({ allowance: "once" }, "2026-10-08T15:00:00.000Z")).toBe(false);
  });

  it("says beside each account which button was pressed, and the day", () => {
    expect(describeAllowance({ allowance: "always", agreedOn: "2026-10-08" })).toBe("Always allowed since 2026-10-08");
    expect(describeAllowance({ allowance: "once", agreedOn: "2026-10-08" })).toMatch(/^Allowed once, on 2026-10-08;/);
    expect(describeAllowance({ allowance: "every", agreedOn: "2026-10-08" })).toMatch(/Always allow every account/);
  });
});

// ---------------------------------------------------------------------------------------------
// The setting and its warning

describe("the Bank and card records setting", () => {
  const entry = SETTINGS.find((s) => s.id === "bank-records")!;

  it("stays planned, with no saved-value definition registered, until the statement screen lands", () => {
    // The switch would do nothing before then; the maintainer's decision is that nobody sees one.
    expect(entry.status).toBe("planned");
    expect(bankRecordsBuilt()).toBe(false);
    expect(Object.keys(SETTING_DEFINITIONS)).not.toContain("bank-records");
  });

  it("is off to start, and its saved value reads back only as on/off and a real date-time", () => {
    expect(entry.defaultValue).toBe("off");
    expect(BANK_RECORDS_DEFINITION.fallback).toEqual({ on: false, everyAccountSince: null });
    expect(BANK_RECORDS_DEFINITION.parsePatch({ on: true })).toEqual({ on: true });
    expect(BANK_RECORDS_DEFINITION.parsePatch({ everyAccountSince: "2026-10-08T15:00:00.000Z" })).toEqual({
      everyAccountSince: "2026-10-08T15:00:00.000Z",
    });
    expect(BANK_RECORDS_DEFINITION.parsePatch({ everyAccountSince: null })).toEqual({ everyAccountSince: null });
    for (const bad of [{ on: "yes" }, { everyAccountSince: "2026-02-30T00:00:00.000Z" }, { everyAccountSince: "yesterday" }, { accounts: [] }, [], null]) {
      expect(BANK_RECORDS_DEFINITION.parsePatch(bad), JSON.stringify(bad)).toBeNull();
    }
    // A hand-edited or future value reads as the fallback: off, the quiet direction.
    expect(readStoredWith(BANK_RECORDS_DEFINITION, '{"on":"yes"}')).toEqual({ on: false, everyAccountSince: null });
    expect(readStoredWith(BANK_RECORDS_DEFINITION, "not json")).toEqual({ on: false, everyAccountSince: null });
  });

  it("has its own warning for turning it on, and names the statement warning and its three buttons", () => {
    expect(entry.warning).toMatch(/^Before turning it on: "/);
    expect(entry.warning).toContain("never keeps an account or card number");
    expect(entry.warning).toContain(BANK_STATEMENT_WARNING.title);
    for (const c of BANK_STATEMENT_WARNING.choices) expect(entry.warning).toContain(c.label);
    expect(BANK_STATEMENT_WARNING.choices.map((c) => [c.id, c.label])).toEqual([
      ["once", "Allow once"],
      ["always", "Always allow this account"],
      ["every", "Always allow every account"],
    ]);
  });

  it("has the statement warning word for word in Part 1 of the settings doc", () => {
    const doc = readFileSync(path.join(process.cwd(), "docs", "architecture", "settings-and-edge-cases.md"), "utf8");
    const part1 = doc.slice(doc.indexOf("## Part 1"), doc.indexOf("## Part 2"));
    const w = BANK_STATEMENT_WARNING;
    const lines = [w.title, ...w.intro, ...w.ifYouGoAhead, ...w.cantProtect, ...w.choices.flatMap((c) => [c.label, c.means])];
    // The doc is wrapped markdown; compare with line breaks folded to spaces.
    const flat = part1.replace(/\s+/g, " ");
    for (const line of lines) expect(flat, `Part 1 is missing: ${line}`).toContain(line);
  });

  it("keeps no tax knowledge or verdict in the warning: it says the project doesn't recommend it, and leaves the call", () => {
    expect(BANK_STATEMENT_WARNING.intro[0]).toBe("The DotAmi project doesn't recommend this. It's your choice.");
    const all = JSON.stringify(BANK_STATEMENT_WARNING);
    expect(all).not.toMatch(/you should/i);
  });
});

// ---------------------------------------------------------------------------------------------
// The store, on a real migrated database

const root = mkdtempSync(path.join(tmpdir(), "dotami-bank-sources-"));
const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const clients: PrismaClient[] = [];

function makeDb(name: string) {
  const folder = path.join(root, name);
  mkdirSync(folder, { recursive: true });
  const file = path.join(folder, "dotami.db");
  const url = `file:${file.replace(/\\/g, "/")}`;
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  const prisma = new PrismaClient({ datasourceUrl: url });
  clients.push(prisma);
  return { folder, file, url, prisma };
}

afterAll(async () => {
  for (const c of clients) await c.$disconnect();
  rmSync(root, { recursive: true, force: true });
});

/**
 * Runs `fn` as if the statement screen had landed: the catalog marks the setting live. The real
 * catalog keeps it planned (tested above); this is the only way to exercise the "on" path before then.
 */
async function asIfBuilt<T>(fn: () => Promise<T>): Promise<T> {
  const entry = SETTINGS.find((s) => s.id === "bank-records") as { status: string };
  const was = entry.status;
  entry.status = "live";
  try {
    return await fn();
  } finally {
    entry.status = was;
  }
}

async function switchOn(prisma: PrismaClient, value: object = { on: true, everyAccountSince: null }) {
  const text = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key: "bank-records" }, create: { key: "bank-records", value: text }, update: { value: text } });
}

const NOW = new Date("2026-10-08T15:00:00.000Z");
/** The day NOW fell on, on this computer: what the list shows. */
const NOW_DAY = localDay(NOW)!;

describe("adding an account needs the switch on — and while the setting is planned, it is off", () => {
  it("refuses every button while planned, even when the file says on, and writes nothing", async () => {
    const { prisma } = makeDb("planned");
    await switchOn(prisma);
    expect(await readBankRecords(prisma)).toEqual({ on: false, everyAccountSince: null });
    for (const allow of ["once", "always", "every"]) {
      await expect(allowAccount(prisma, { allow, name: "Business chequing" }, NOW)).rejects.toThrow(BankRecordsOffError);
    }
    expect(await prisma.sourceAccount.count()).toBe(0);
    expect(JSON.parse((await prisma.setting.findUnique({ where: { key: "bank-records" } }))!.value)).toEqual({ on: true, everyAccountSince: null });
  });

  it("refuses when the setting is built but switched off (nothing saved counts as off)", async () => {
    const { prisma } = makeDb("built-off");
    await asIfBuilt(async () => {
      await expect(allowAccount(prisma, { allow: "always", name: "Business chequing" }, NOW)).rejects.toThrow(BankRecordsOffError);
      await switchOn(prisma, { on: false, everyAccountSince: null });
      await expect(allowAccount(prisma, { allow: "always", name: "Business chequing" }, NOW)).rejects.toThrow(BankRecordsOffError);
    });
    expect(await prisma.sourceAccount.count()).toBe(0);
  });
});

describe("the three buttons, and taking back", () => {
  it("Allow once and Always allow this account list the account under its name, with the day", async () => {
    const { prisma } = makeDb("buttons");
    await switchOn(prisma);
    await asIfBuilt(async () => {
      const once = await allowAccount(prisma, { allow: "once", name: "  Business   chequing " }, NOW);
      expect(once).toMatchObject({ name: "Business chequing", allowance: "once" });
      expect(once.agreedOn).toBe(NOW_DAY);
      const always = await allowAccount(prisma, { allow: "always", name: "Visa ending 1234" }, NOW);
      expect(always.allowance).toBe("always");

      const state = await readBankSources(prisma);
      expect(state.on).toBe(true);
      expect(state.everyAccountSince).toBeNull();
      expect(state.accounts.map((a) => [a.name, a.allowance])).toEqual([
        ["Business chequing", "once"],
        ["Visa ending 1234", "always"],
      ]);
      expect(needsWarning(state.accounts[0], state.everyAccountSince)).toBe(true);
      expect(needsWarning(state.accounts[1], state.everyAccountSince)).toBe(false);
    });
    // What the row holds: the name, the button and the dates. Nothing else.
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "SourceAccount"`);
    expect(Object.keys(rows[0]).sort()).toEqual(["agreedAt", "allowance", "createdAt", "id", "name", "retiredAt"]);
  });

  it("allowing a listed account again (picked by id) changes its button and its day, and adds no second row", async () => {
    const { prisma } = makeDb("again");
    await switchOn(prisma);
    await asIfBuilt(async () => {
      const first = await allowAccount(prisma, { allow: "once", name: "Business chequing" }, NOW);
      const later = new Date("2026-11-20T15:00:00.000Z");
      const again = await allowAccount(prisma, { allow: "always", id: first.id }, later);
      expect(again).toMatchObject({ id: first.id, allowance: "always" });
      expect(again.agreedOn).toBe(localDay(later));
    });
    expect(await prisma.sourceAccount.count()).toBe(1);
  });

  it("Always allow every account records the moment in the setting; taking it back brings the warnings back", async () => {
    const { prisma } = makeDb("every");
    await switchOn(prisma);
    await asIfBuilt(async () => {
      const a = await allowAccount(prisma, { allow: "every", name: "Business chequing" }, NOW);
      expect(a.allowance).toBe("every");
      let state = await readBankSources(prisma);
      expect(state.everyAccountSince).toBe(NOW_DAY);
      expect(needsWarning(null, (await readBankRecords(prisma)).everyAccountSince)).toBe(false);

      await takeBackEveryAccount(prisma);
      state = await readBankSources(prisma);
      expect(state.everyAccountSince).toBeNull();
      expect(state.on).toBe(true);
      // The account stays listed, and its next statement shows the warning again.
      expect(state.accounts).toHaveLength(1);
      expect(needsWarning(state.accounts[0], state.everyAccountSince)).toBe(true);
    });
  });

  it("taking an account back takes it off the list, keeps the row's name and days, and can't be done twice", async () => {
    const { prisma } = makeDb("retire");
    await switchOn(prisma);
    await asIfBuilt(async () => {
      const a = await allowAccount(prisma, { allow: "always", name: "Business chequing" }, NOW);
      await retireAccount(prisma, a.id, new Date("2026-10-09T15:00:00.000Z"));
      expect((await readBankSources(prisma)).accounts).toEqual([]);
      await expect(retireAccount(prisma, a.id)).rejects.toThrow(AccountNotFoundError);
      // A taken-back account can't be allowed again by id: its next statement starts over by name.
      await expect(allowAccount(prisma, { allow: "always", id: a.id }, NOW)).rejects.toThrow(AccountNotFoundError);
      const again = await allowAccount(prisma, { allow: "once", name: "Business chequing" }, NOW);
      expect(again.id).not.toBe(a.id);
    });
    const rows = await prisma.sourceAccount.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0].retiredAt?.toISOString()).toBe("2026-10-09T15:00:00.000Z");
    expect(rows[1].retiredAt).toBeNull();
  });

  it("taking back works with the switch off and while the setting is planned", async () => {
    const { prisma } = makeDb("retire-off");
    const row = await prisma.sourceAccount.create({ data: { name: "Business chequing", allowance: "always", agreedAt: NOW } });
    await switchOn(prisma, { on: false, everyAccountSince: NOW.toISOString() });
    await retireAccount(prisma, row.id);
    await takeBackEveryAccount(prisma);
    expect((await prisma.sourceAccount.findUnique({ where: { id: row.id } }))!.retiredAt).not.toBeNull();
    expect(JSON.parse((await prisma.setting.findUnique({ where: { key: "bank-records" } }))!.value)).toEqual({ on: false, everyAccountSince: null });
  });
});

describe("what is refused, with nothing written", () => {
  it("a name holding an account number, a name already listed, an unknown field, both or neither of id and name", async () => {
    const { prisma, folder } = makeDb("refused");
    await switchOn(prisma);
    await asIfBuilt(async () => {
      await allowAccount(prisma, { allow: "always", name: "Business chequing" }, NOW);
      const bad: unknown[] = [
        { allow: "always", name: `Chequing ${ACCOUNT_DIGITS}` },
        { allow: "always", name: "BUSINESS  chequing" },
        { allow: "always", name: "Savings", accountNumber: ACCOUNT_DIGITS },
        { allow: "always", name: "Savings", id: "x" },
        { allow: "always" },
        { allow: "forever", name: "Savings" },
        { name: "Savings" },
        "Savings",
        null,
      ];
      for (const body of bad) {
        await expect(allowAccount(prisma, body, NOW), JSON.stringify(body)).rejects.toThrow(AccountInputError);
      }
    });
    expect((await prisma.sourceAccount.findMany()).map((a) => a.name)).toEqual(["Business chequing"]);
    await prisma.$disconnect();
    // The invented number is nowhere in the data file or beside it.
    const needle = Buffer.from(ACCOUNT_DIGITS, "utf8");
    expect(readdirSync(folder).filter((f) => readFileSync(path.join(folder, f)).includes(needle))).toEqual([]);
  });

  it("more than the cap of accounts in use", async () => {
    const { prisma } = makeDb("cap");
    await switchOn(prisma);
    await prisma.sourceAccount.createMany({
      data: Array.from({ length: MAX_LIVE_ACCOUNTS }, (_, i) => ({ name: `Account ${String.fromCharCode(65 + (i % 26))}${i % 10}${Math.floor(i / 10)}`, allowance: "once", agreedAt: NOW })),
    });
    await asIfBuilt(async () => {
      await expect(allowAccount(prisma, { allow: "once", name: "One more" }, NOW)).rejects.toThrow(/already holds 100 accounts/);
    });
    expect(await prisma.sourceAccount.count()).toBe(MAX_LIVE_ACCOUNTS);
  });
});

// ---------------------------------------------------------------------------------------------
// The routes: page-only, body through the shared guard, the right answer for each outcome

describe("/api/figures/bank-sources and /retire", () => {
  type Route = { GET?: (r: Request) => Promise<Response>; POST: (r: Request) => Promise<Response> };
  let sources: Route;
  let retire: Route;
  let db: ReturnType<typeof makeDb>;
  const previousUrl = process.env.DATABASE_URL;
  const fromPage = { "sec-fetch-site": "same-origin" };
  const errorSpy = vi.spyOn(console, "error");

  beforeAll(async () => {
    db = makeDb("routes");
    // The routes build their own client from DATABASE_URL when first imported.
    process.env.DATABASE_URL = db.url;
    sources = (await import("@/app/api/figures/bank-sources/route")) as Route;
    retire = (await import("@/app/api/figures/bank-sources/retire/route")) as Route;
  }, 120_000);

  afterAll(async () => {
    await (await import("@/lib/prisma")).prisma.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    errorSpy.mockRestore();
  });

  afterEach(() => __resetRateLimitStateForTests());

  const request = (url: string, method: string, body?: unknown, headers: Record<string, string> = fromPage) =>
    new Request(`http://localhost${url}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const get = (headers?: Record<string, string>) => sources.GET!(request("/api/figures/bank-sources", "GET", undefined, headers));
  const add = (body: unknown, headers?: Record<string, string>) => sources.POST(request("/api/figures/bank-sources", "POST", body, headers));
  const takeBack = (body: unknown, headers?: Record<string, string>) =>
    retire.POST(request("/api/figures/bank-sources/retire", "POST", body, headers));

  it("answers DotAmi's own page: the list, and off while the setting is planned", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ on: false, everyAccountSince: null, accounts: [] });
  });

  it("refuses anything that isn't DotAmi's own page (an agent, a script, another site), and changes nothing", async () => {
    await switchOn(db.prisma);
    const row = await db.prisma.sourceAccount.create({ data: { name: "Business chequing", allowance: "once", agreedAt: NOW } });
    const callers: Record<string, string>[] = [{}, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "none" }, { "sec-fetch-site": "same-site" }];
    await asIfBuilt(async () => {
      for (const headers of callers) {
        for (const res of [await get(headers), await add({ allow: "always", name: "Savings" }, headers), await takeBack({ id: row.id }, headers)]) {
          expect(res.status).toBe(403);
          expect(((await res.json()) as { error: string }).error).toMatch(/only be listed, allowed or taken back from DotAmi's own window/);
        }
      }
    });
    expect(await db.prisma.sourceAccount.findMany()).toEqual([row]);
    await db.prisma.sourceAccount.deleteMany();
    await db.prisma.setting.deleteMany();
  });

  it("refuses to add while the setting is planned (409), and says why", async () => {
    await switchOn(db.prisma);
    const res = await add({ allow: "always", name: "Business chequing" });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe("Bank and card records is off in Settings, so no account can be added.");
    expect(await db.prisma.sourceAccount.count()).toBe(0);
  });

  it("with the switch on: adds, lists, takes back; a refused name is never echoed or logged", async () => {
    await asIfBuilt(async () => {
      const added = await add({ allow: "always", name: "Visa ending 1234" });
      expect(added.status).toBe(200);
      const body = (await added.json()) as { account: { id: string; name: string }; accounts: { id: string }[]; on: boolean };
      expect(body.account.name).toBe("Visa ending 1234");
      expect(body.on).toBe(true);
      expect(body.accounts.map((a) => a.id)).toEqual([body.account.id]);

      errorSpy.mockClear();
      const refused = await add({ allow: "always", name: `Chequing ${ACCOUNT_DIGITS}` });
      expect(refused.status).toBe(400);
      const text = await refused.text();
      expect(text).toContain("Leave the account number out");
      expect(text).not.toContain(ACCOUNT_DIGITS);
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(ACCOUNT_DIGITS);

      const gone = await takeBack({ id: body.account.id });
      expect(gone.status).toBe(200);
      expect(((await gone.json()) as { accounts: unknown[] }).accounts).toEqual([]);
      expect((await takeBack({ id: body.account.id })).status).toBe(404);
    });
  });

  it("takes 'every account' back with { every: true }, and refuses a body that says neither", async () => {
    await switchOn(db.prisma, { on: true, everyAccountSince: NOW.toISOString() });
    await asIfBuilt(async () => {
      expect(((await (await get()).json()) as { everyAccountSince: string | null }).everyAccountSince).toBe(NOW_DAY);
      const res = await takeBack({ every: true });
      expect(res.status).toBe(200);
      expect(((await res.json()) as { everyAccountSince: string | null }).everyAccountSince).toBeNull();
    });
    for (const body of [{}, { every: "yes" }, { id: "x", every: true }, []]) {
      expect((await takeBack(body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  it("reads its body through the shared guard: not JSON, or too big, is refused", async () => {
    const notJson = new Request("http://localhost/api/figures/bank-sources", {
      method: "POST",
      headers: { "content-type": "text/plain", ...fromPage },
      body: "name=Savings",
    });
    expect((await sources.POST(notJson)).status).toBe(415);
    expect((await add({ allow: "once", name: "Savings", pad: "x".repeat(8_000) })).status).toBe(413);
  });
});
