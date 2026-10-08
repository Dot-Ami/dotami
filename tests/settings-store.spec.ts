/**
 * [8e] Saved settings: what may be stored under a setting's id, and that it comes back. Runs on a
 * throwaway migrated SQLite file (same setup as tests/privacy-holdings.spec.ts) so the Setting
 * table in the real migration is the one under test, plus the /api/settings routes in front of it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { SettingInputError, readSetting, writeSetting } from "@/lib/settings/store";
import {
  MAX_DISMISSALS,
  MAX_REMINDED_IDEAS,
  SETTING_DEFINITIONS,
  isLiveSettingId,
  valueFromStored,
} from "@/lib/settings/values";

const root = mkdtempSync(path.join(tmpdir(), "dotami-settings-"));
const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

let prisma: PrismaClient;
let url: string;

beforeAll(() => {
  const folder = path.join(root, "data");
  mkdirSync(folder, { recursive: true });
  url = `file:${path.join(folder, "dotami.db").replace(/\\/g, "/")}`;
  // The real migrations, applied the way `npm run prisma:deploy` applies them.
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  prisma = new PrismaClient({ datasourceUrl: url });
});

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

beforeEach(async () => {
  await prisma.setting.deleteMany();
  __resetRateLimitStateForTests();
});

const rows = () => prisma.setting.count();

describe("what a figure-reminders value may be", () => {
  const parse = SETTING_DEFINITIONS["figure-reminders"].parsePatch;

  it("takes any combination of monthly, quarterly and yearly, or none", () => {
    expect(parse({ cadences: [] })).toEqual({ cadences: [] });
    expect(parse({ cadences: ["monthly"] })).toEqual({ cadences: ["monthly"] });
    expect(parse({ cadences: ["yearly", "monthly"] })).toEqual({ cadences: ["monthly", "yearly"] });
    expect(parse({ cadences: ["monthly", "quarterly", "yearly"] })).toEqual({
      cadences: ["monthly", "quarterly", "yearly"],
    });
  });

  it("keeps each cadence once, in a fixed order", () => {
    expect(parse({ cadences: ["yearly", "yearly", "quarterly"] })).toEqual({ cadences: ["quarterly", "yearly"] });
  });

  it("refuses a cadence that isn't one of the three, rather than dropping it", () => {
    expect(parse({ cadences: ["weekly"] })).toBeNull();
    expect(parse({ cadences: ["monthly", "weekly"] })).toBeNull();
    expect(parse({ cadences: ["Monthly"] })).toBeNull();
    expect(parse({ cadences: "monthly" })).toBeNull();
    expect(parse({ cadences: [1] })).toBeNull();
    expect(parse({ cadences: null })).toBeNull();
  });

  it("takes a list of idea ids, each once", () => {
    expect(parse({ ideaIds: [] })).toEqual({ ideaIds: [] });
    expect(parse({ ideaIds: ["a", "b", "a"] })).toEqual({ ideaIds: ["a", "b"] });
  });

  it("refuses ids that aren't plain non-empty strings, or too many of them", () => {
    expect(parse({ ideaIds: [""] })).toBeNull();
    expect(parse({ ideaIds: [7] })).toBeNull();
    expect(parse({ ideaIds: [null] })).toBeNull();
    expect(parse({ ideaIds: ["x".repeat(101)] })).toBeNull();
    expect(parse({ ideaIds: "abc" })).toBeNull();
    const tooMany = Array.from({ length: MAX_REMINDED_IDEAS + 1 }, (_, i) => `idea-${i}`);
    expect(parse({ ideaIds: tooMany })).toBeNull();
    expect(parse({ ideaIds: tooMany.slice(0, MAX_REMINDED_IDEAS) })).not.toBeNull();
  });

  it("takes the 'Not this time' answers: an idea, a cadence and the last day of the period, each once", () => {
    const one = { ideaId: "idea-1", cadence: "monthly", periodEnd: "2026-09-30" };
    expect(parse({ dismissed: [] })).toEqual({ dismissed: [] });
    expect(parse({ dismissed: [one] })).toEqual({ dismissed: [one] });
    expect(parse({ dismissed: [one, { ...one }, { ...one, cadence: "quarterly" }] })).toEqual({
      dismissed: [one, { ...one, cadence: "quarterly" }],
    });
    // A leap day is a real day.
    expect(parse({ dismissed: [{ ...one, periodEnd: "2028-02-29" }] })).not.toBeNull();
  });

  it("refuses a dismissal that is malformed, rather than dropping it", () => {
    const one = { ideaId: "idea-1", cadence: "monthly", periodEnd: "2026-09-30" };
    expect(parse({ dismissed: "idea-1" })).toBeNull();
    expect(parse({ dismissed: [null] })).toBeNull();
    expect(parse({ dismissed: [["idea-1", "monthly", "2026-09-30"]] })).toBeNull();
    expect(parse({ dismissed: [{ ...one, ideaId: "" }] })).toBeNull();
    expect(parse({ dismissed: [{ ...one, ideaId: "x".repeat(101) }] })).toBeNull();
    expect(parse({ dismissed: [{ ...one, cadence: "weekly" }] })).toBeNull();
    // Not a day on the calendar, or not written the plain way.
    for (const periodEnd of ["2026-02-30", "2026-9-30", "2026-09-30T00:00:00Z", "30/09/2026", "", 20260930]) {
      expect(parse({ dismissed: [{ ...one, periodEnd }] }), String(periodEnd)).toBeNull();
    }
    // An extra key, or a missing one.
    expect(parse({ dismissed: [{ ...one, amount: 5 }] })).toBeNull();
    expect(parse({ dismissed: [{ ideaId: "idea-1", cadence: "monthly" }] })).toBeNull();
    const tooMany = Array.from({ length: MAX_DISMISSALS + 1 }, (_, i) => ({ ...one, ideaId: `idea-${i}` }));
    expect(parse({ dismissed: tooMany })).toBeNull();
    expect(parse({ dismissed: tooMany.slice(0, MAX_DISMISSALS) })).not.toBeNull();
  });

  it("refuses a key it doesn't know, and anything that isn't an object", () => {
    expect(parse({ cadences: [], extra: true })).toBeNull();
    expect(parse({ nope: 1 })).toBeNull();
    expect(parse(["monthly"])).toBeNull();
    expect(parse("monthly")).toBeNull();
    expect(parse(null)).toBeNull();
    expect(parse(undefined)).toBeNull();
  });

  it("names only the keys it was given (so a patch leaves the others alone)", () => {
    expect(parse({})).toEqual({});
    expect(Object.keys(parse({ cadences: ["monthly"] })!)).toEqual(["cadences"]);
  });
});

describe("reading a setting back", () => {
  it("is 'none ticked, no ideas' before anything is saved, and saves nothing by being read", async () => {
    expect(await readSetting(prisma, "figure-reminders")).toEqual({ cadences: [], ideaIds: [], dismissed: [] });
    expect(await rows()).toBe(0);
  });

  it("reads a damaged stored value as the default instead of failing", () => {
    expect(valueFromStored("figure-reminders", "not json at all")).toEqual({ cadences: [], ideaIds: [], dismissed: [] });
    expect(valueFromStored("figure-reminders", '{"cadences":["weekly"]}')).toEqual({ cadences: [], ideaIds: [], dismissed: [] });
    expect(valueFromStored("figure-reminders", '{"cadences":["monthly"],"fromAFutureVersion":1}')).toEqual({
      cadences: [],
      ideaIds: [],
      dismissed: [],
    });
    expect(valueFromStored("figure-reminders", "[]")).toEqual({ cadences: [], ideaIds: [], dismissed: [] });
    expect(valueFromStored("figure-reminders", "null")).toEqual({ cadences: [], ideaIds: [], dismissed: [] });
  });

  it("reads a half-written stored value with the default for the missing part", () => {
    expect(valueFromStored("figure-reminders", '{"cadences":["yearly"]}')).toEqual({ cadences: ["yearly"], ideaIds: [], dismissed: [] });
  });

  it("does not hand out the shared default, so changing a result can't change the next read", async () => {
    const first = await readSetting(prisma, "figure-reminders");
    first.cadences.push("monthly");
    first.ideaIds.push("x");
    expect(await readSetting(prisma, "figure-reminders")).toEqual({ cadences: [], ideaIds: [], dismissed: [] });
    expect(SETTING_DEFINITIONS["figure-reminders"].fallback).toEqual({ cadences: [], ideaIds: [], dismissed: [] });
  });
});

describe("saving a setting", () => {
  it("round-trips: what was saved is what is read", async () => {
    const saved = await writeSetting(prisma, "figure-reminders", { cadences: ["monthly", "yearly"] });
    expect(saved).toEqual({ cadences: ["monthly", "yearly"], ideaIds: [], dismissed: [] });
    expect(await readSetting(prisma, "figure-reminders")).toEqual(saved);
    // A different client on the same file (as a restart would be) sees it too.
    const again = new PrismaClient({ datasourceUrl: url });
    try {
      expect(await readSetting(again, "figure-reminders")).toEqual(saved);
    } finally {
      await again.$disconnect();
    }
  });

  it("keeps one row per setting, keyed by its catalog id, holding JSON text", async () => {
    await writeSetting(prisma, "figure-reminders", { cadences: ["quarterly"] });
    await writeSetting(prisma, "figure-reminders", { cadences: ["monthly"] });
    const all = await prisma.setting.findMany();
    expect(all).toHaveLength(1);
    expect(all[0].key).toBe("figure-reminders");
    expect(JSON.parse(all[0].value)).toEqual({ cadences: ["monthly"], ideaIds: [], dismissed: [] });
    expect(all[0].updatedAt).toBeInstanceOf(Date);
  });

  it("changes only the keys it names: ticking a box keeps the ideas, turning a switch keeps the ticks", async () => {
    await writeSetting(prisma, "figure-reminders", { ideaIds: ["idea-1", "idea-2"] });
    await writeSetting(prisma, "figure-reminders", { cadences: ["monthly", "yearly"] });
    expect(await readSetting(prisma, "figure-reminders")).toEqual({
      cadences: ["monthly", "yearly"],
      ideaIds: ["idea-1", "idea-2"],
      dismissed: [],
    });
    await writeSetting(prisma, "figure-reminders", { ideaIds: ["idea-2"] });
    expect(await readSetting(prisma, "figure-reminders")).toEqual({ cadences: ["monthly", "yearly"], ideaIds: ["idea-2"], dismissed: [] });
    // Unticking everything is a real choice, and is kept as one.
    await writeSetting(prisma, "figure-reminders", { cadences: [] });
    expect(await readSetting(prisma, "figure-reminders")).toEqual({ cadences: [], ideaIds: ["idea-2"], dismissed: [] });
  });

  it("keeps a dismissal when a tick or a switch is saved, and the ticks when a dismissal is saved", async () => {
    const dismissed = [{ ideaId: "idea-1", cadence: "monthly" as const, periodEnd: "2026-09-30" }];
    await writeSetting(prisma, "figure-reminders", { cadences: ["monthly"], ideaIds: ["idea-1"] });
    await writeSetting(prisma, "figure-reminders", { dismissed });
    await writeSetting(prisma, "figure-reminders", { cadences: ["monthly", "yearly"] });
    await writeSetting(prisma, "figure-reminders", { ideaIds: ["idea-1", "idea-2"] });
    expect(await readSetting(prisma, "figure-reminders")).toEqual({
      cadences: ["monthly", "yearly"],
      ideaIds: ["idea-1", "idea-2"],
      dismissed,
    });
  });

  it("loses neither change when two saves arrive together", async () => {
    await Promise.all([
      writeSetting(prisma, "figure-reminders", { cadences: ["quarterly"] }),
      writeSetting(prisma, "figure-reminders", { ideaIds: ["idea-9"] }),
    ]);
    expect(await readSetting(prisma, "figure-reminders")).toEqual({ cadences: ["quarterly"], ideaIds: ["idea-9"], dismissed: [] });
  });

  it("keeps an id for an idea that no longer exists without complaint (readers ignore ids they don't know)", async () => {
    await writeSetting(prisma, "figure-reminders", { ideaIds: ["an-idea-that-was-removed"] });
    expect(await readSetting(prisma, "figure-reminders")).toEqual({
      cadences: [],
      ideaIds: ["an-idea-that-was-removed"],
      dismissed: [],
    });
  });

  it("refuses a bad value and saves nothing, leaving the old value as it was", async () => {
    await writeSetting(prisma, "figure-reminders", { cadences: ["monthly"] });
    for (const bad of [{ cadences: ["weekly"] }, { extra: 1 }, { ideaIds: [3] }, "monthly", null, [], undefined]) {
      await expect(writeSetting(prisma, "figure-reminders", bad)).rejects.toBeInstanceOf(SettingInputError);
    }
    expect(await readSetting(prisma, "figure-reminders")).toEqual({ cadences: ["monthly"], ideaIds: [], dismissed: [] });
    expect(await rows()).toBe(1);
  });

  it("refuses an unknown setting id, reading or writing, and creates no row", async () => {
    for (const id of ["no-such-setting", "", "__proto__", "constructor", "toString"]) {
      await expect(writeSetting(prisma, id as never, { cadences: [] })).rejects.toBeInstanceOf(SettingInputError);
      await expect(readSetting(prisma, id as never)).rejects.toBeInstanceOf(SettingInputError);
    }
    await expect(writeSetting(prisma, undefined as never, {})).rejects.toBeInstanceOf(SettingInputError);
    expect(await rows()).toBe(0);
  });

  it("refuses a setting that is in the catalog but whose story isn't built", async () => {
    // "data-folder" is a real catalog id, still `planned`: it has no control, so it can't be saved.
    await expect(writeSetting(prisma, "data-folder" as never, { path: "C:\\somewhere" })).rejects.toBeInstanceOf(SettingInputError);
    await expect(readSetting(prisma, "data-folder" as never)).rejects.toBeInstanceOf(SettingInputError);
    expect(await rows()).toBe(0);
  });

  it("knows which ids are live", () => {
    expect(isLiveSettingId("figure-reminders")).toBe(true);
    expect(isLiveSettingId("data-folder")).toBe(false);
    expect(isLiveSettingId("hasOwnProperty")).toBe(false);
    expect(isLiveSettingId(5)).toBe(false);
    expect(isLiveSettingId(null)).toBe(false);
  });
});

describe("the /api/settings routes", () => {
  // Pointed at the throwaway file before the route (and the Prisma client it builds) is loaded.
  let route: typeof import("@/app/api/settings/route");
  const originalUrl = process.env.DATABASE_URL;
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    route = await import("@/app/api/settings/route");
  });
  afterAll(async () => {
    // Close the routes' own client (it holds the file open) and put the environment back.
    await (await import("@/lib/prisma")).prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });

  const fromPage = { "sec-fetch-site": "same-origin" };
  const put = (body: unknown, headers: Record<string, string> = {}) =>
    route.PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", ...fromPage, ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  const get = (query: string, headers: Record<string, string> = fromPage) =>
    route.GET(new Request(`http://localhost/api/settings${query}`, { headers }));

  it("saves through PUT and reads it back through GET", async () => {
    const saved = await put({ id: "figure-reminders", value: { cadences: ["quarterly", "monthly"] } });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ id: "figure-reminders", value: { cadences: ["monthly", "quarterly"], ideaIds: [], dismissed: [] } });

    const read = await get("?id=figure-reminders");
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual({ id: "figure-reminders", value: { cadences: ["monthly", "quarterly"], ideaIds: [], dismissed: [] } });
  });

  it("answers only DotAmi's own page: no header, a cross-site header or a script's request is refused, and nothing is read or saved", async () => {
    const body = { id: "figure-reminders", value: { cadences: ["yearly"] } };
    // Sec-Fetch-Site is absent when a program (an agent, curl) makes the request.
    expect((await put(body, { "sec-fetch-site": "" })).status).toBe(403);
    expect((await put(body, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await put(body, { "sec-fetch-site": "same-site" })).status).toBe(403);
    expect((await get("?id=figure-reminders", {})).status).toBe(403);
    expect((await get("?id=figure-reminders", { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect(await rows()).toBe(0);
  });

  it("refuses an unknown or unbuilt setting id with a 400 and saves nothing", async () => {
    expect((await put({ id: "no-such-setting", value: {} })).status).toBe(400);
    expect((await put({ id: "data-folder", value: { path: "x" } })).status).toBe(400);
    expect((await put({ value: { cadences: [] } })).status).toBe(400);
    expect((await put({ id: 7, value: {} })).status).toBe(400);
    expect((await get("?id=no-such-setting")).status).toBe(400);
    expect((await get("")).status).toBe(400);
    expect(await rows()).toBe(0);
  });

  it("refuses a bad value with a 400 and saves nothing", async () => {
    const res = await put({ id: "figure-reminders", value: { cadences: ["weekly"] } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/isn't one this setting accepts/);
    expect((await put({ id: "figure-reminders", value: { surprise: 1 } })).status).toBe(400);
    expect((await put({ id: "figure-reminders" })).status).toBe(400);
    expect((await put("not json")).status).toBe(400);
    expect(await rows()).toBe(0);
  });

  it("reads its body through the shared size and type guard", async () => {
    // Not JSON by content type, and a body over the cap — the same refusals every write route gives.
    expect((await put({ id: "figure-reminders", value: {} }, { "content-type": "text/plain" })).status).toBe(415);
    const huge = { id: "figure-reminders", value: { ideaIds: ["x".repeat(70 * 1024)] } };
    expect((await put(huge)).status).toBe(413);
    expect(await rows()).toBe(0);
  });
});
