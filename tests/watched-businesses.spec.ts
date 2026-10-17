/**
 * Businesses you're watching (docs/architecture/competitive-landscape.md § 6.2 item 5, task S2.5.23i; the
 * maintainer released it on 2026-10-17, "yah, this is fine. Lets do it"): the person's own list for an idea,
 * each business under the name they typed, with an optional link, their note and the ads they saw, each with
 * the day they saw it. Run against a throwaway data file migrated by Prisma, first through the storage code
 * (lib/landscape/watched.ts), then through the route handlers themselves.
 *
 * What is checked: the list keeps the order the person added things in; a link is kept only when it is an
 * http: or https: address (javascript:, data:, file: and the rest are refused by the storage and so by the
 * routes); the lengths are capped; an idea's list goes with the idea; and every route answers only DotAmi's
 * own window, reads its body through readJsonWithLimit and has a rate limit with its own bucket.
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { VentureNotFoundError } from "@/lib/figures/store";
import { dayOnThisComputer } from "@/lib/futures/person";
import {
  addWatched,
  editWatched,
  listWatched,
  removeWatched,
  safeLink,
  WATCHED_AD_LINKS_MAX,
  WATCHED_LINK_MAX,
  WATCHED_NAME_MAX,
  WATCHED_NOTE_MAX,
  WATCHED_PER_IDEA_MAX,
  WatchedInputError,
  WatchedNotFoundError,
} from "@/lib/landscape/watched";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

const dbFile = path.join(tmpdir(), `dotami-watched-${randomUUID()}.db`);
const previousUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;
let ventureId: string;
let otherVentureId: string;

type ListParams = { params: Promise<{ id: string }> };
type OneParams = { params: Promise<{ id: string; businessId: string }> };
const routes = {} as {
  list: (request: Request, context: ListParams) => Promise<Response>;
  add: (request: Request, context: ListParams) => Promise<Response>;
  edit: (request: Request, context: OneParams) => Promise<Response>;
  remove: (request: Request, context: OneParams) => Promise<Response>;
};

beforeAll(async () => {
  migratedFile(dbFile);
  // The routes build their own client from DATABASE_URL when first imported.
  process.env.DATABASE_URL = fileUrl(dbFile);
  prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  const list = await import("@/app/api/futures/[id]/watched/route");
  routes.list = list.GET;
  routes.add = list.POST;
  routes.edit = (await import("@/app/api/futures/[id]/watched/[businessId]/route")).POST;
  routes.remove = (await import("@/app/api/futures/[id]/watched/[businessId]/remove/route")).POST;
  ventureId = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
  otherVentureId = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  // The routes' own client also holds the file open; Windows won't delete it until it lets go.
  await (await import("@/lib/prisma")).prisma.$disconnect();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

afterEach(() => __resetRateLimitStateForTests());

const TODAY = () => dayOnThisComputer(new Date());

/** The links a person might paste that must never be kept, whatever their capitals or spaces. */
const REFUSED_LINKS = [
  "javascript:alert(1)",
  "JavaScript:alert(document.cookie)",
  "  javascript:alert(1)",
  "java\tscript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "file:///C:/Users/someone/secret.txt",
  "ftp://example.com/file",
  "mailto:owner@example.com",
  "vbscript:msgbox(1)",
  "blob:https://example.com/abc",
  "about:blank",
  "//example.com/no-scheme",
  "example.com",
  "not a link at all",
  "https://",
];

describe("safeLink: only http: and https: addresses", () => {
  it("keeps an http or https address, as the browser reads it", () => {
    expect(safeLink("https://example.com/shop")).toBe("https://example.com/shop");
    expect(safeLink("  http://example.com  ")).toBe("http://example.com/");
    expect(safeLink("HTTPS://Example.com/Ads?id=1")).toBe("https://example.com/Ads?id=1");
  });

  it("refuses every other kind of address", () => {
    for (const raw of REFUSED_LINKS) expect(safeLink(raw), raw).toBeNull();
  });

  it("refuses an address with a name or password written into it, and one too long", () => {
    expect(safeLink("https://someone:secret@example.com/")).toBeNull();
    expect(safeLink(`https://example.com/${"a".repeat(WATCHED_LINK_MAX)}`)).toBeNull();
  });
});

describe("the storage: the person's own list for one idea", () => {
  it("starts empty, and keeps a business under the name typed, with its link, note and ad links", async () => {
    expect(await listWatched(prisma, ventureId)).toEqual([]);
    const added = await addWatched(prisma, ventureId, {
      nameAsTyped: "  Invented Shop A  ",
      url: "https://example.com/a",
      note: "Saw their van on 4th Street.",
      adLinks: [{ url: "https://example.com/ad/1", seenOn: "2026-10-01" }],
    });
    expect(added).toMatchObject({
      nameAsTyped: "Invented Shop A",
      url: "https://example.com/a",
      note: "Saw their van on 4th Street.",
      adLinks: [{ url: "https://example.com/ad/1", seenOn: "2026-10-01" }],
      addedOn: TODAY(),
    });
    expect(typeof added.id).toBe("string");
    expect(await listWatched(prisma, ventureId)).toEqual([added]);
  });

  it("lists in the order added, never by name or anything else", async () => {
    await addWatched(prisma, ventureId, { nameAsTyped: "AAA invented first by name" });
    await addWatched(prisma, ventureId, { nameAsTyped: "Invented Shop C" });
    expect((await listWatched(prisma, ventureId)).map((b) => b.nameAsTyped)).toEqual(["Invented Shop A", "AAA invented first by name", "Invented Shop C"]);
    // Another idea's list is its own.
    expect(await listWatched(prisma, otherVentureId)).toEqual([]);
  });

  it("a link, a note and ad links are optional; an empty one is kept as none", async () => {
    const b = await addWatched(prisma, otherVentureId, { nameAsTyped: "Invented, no link", url: "", note: "   " });
    expect(b).toMatchObject({ url: null, note: null, adLinks: [] });
  });

  it("refuses a business with no name, or a name, note or list too long, with nothing kept", async () => {
    const before = await listWatched(prisma, otherVentureId);
    for (const input of [
      {},
      { nameAsTyped: "" },
      { nameAsTyped: "   " },
      { nameAsTyped: 42 },
      { nameAsTyped: "x".repeat(WATCHED_NAME_MAX + 1) },
      { nameAsTyped: "Fine", note: "x".repeat(WATCHED_NOTE_MAX + 1) },
      { nameAsTyped: "Fine", note: 7 },
      { nameAsTyped: "Fine", adLinks: "https://example.com" },
      { nameAsTyped: "Fine", adLinks: Array.from({ length: WATCHED_AD_LINKS_MAX + 1 }, () => ({ url: "https://example.com/ad", seenOn: "2026-10-01" })) },
      null,
      "a string",
    ]) {
      await expect(addWatched(prisma, otherVentureId, input), JSON.stringify(input)?.slice(0, 80)).rejects.toThrow(WatchedInputError);
    }
    expect(await listWatched(prisma, otherVentureId)).toEqual(before);
  });

  it("refuses a link or an ad link that isn't http or https, so javascript:, data: and file: are never kept", async () => {
    const before = await listWatched(prisma, otherVentureId);
    for (const raw of REFUSED_LINKS) {
      await expect(addWatched(prisma, otherVentureId, { nameAsTyped: "Invented", url: raw }), raw).rejects.toThrow(WatchedInputError);
      await expect(
        addWatched(prisma, otherVentureId, { nameAsTyped: "Invented", adLinks: [{ url: raw, seenOn: "2026-10-01" }] }),
        raw,
      ).rejects.toThrow(WatchedInputError);
    }
    expect(await listWatched(prisma, otherVentureId)).toEqual(before);
    // Nothing in the file holds one either.
    const rows = await prisma.watchedBusiness.findMany();
    expect(JSON.stringify(rows)).not.toMatch(/javascript:|data:text|file:\/\//i);
  });

  it("an ad link needs the day the person saw it: a real day, not after today", async () => {
    for (const seenOn of [undefined, "", "2026-02-30", "2026-13-01", "01/10/2026", "2999-01-01", 20261001]) {
      await expect(
        addWatched(prisma, otherVentureId, { nameAsTyped: "Invented", adLinks: [{ url: "https://example.com/ad", seenOn }] }),
        String(seenOn),
      ).rejects.toThrow(WatchedInputError);
    }
    const ok = await addWatched(prisma, otherVentureId, { nameAsTyped: "Invented, seen today", adLinks: [{ url: "https://example.com/ad", seenOn: TODAY() }] });
    expect(ok.adLinks).toEqual([{ url: "https://example.com/ad", seenOn: TODAY() }]);
  });

  it("edits a business in place: its place in the list and the day added stay", async () => {
    const [first] = await listWatched(prisma, ventureId);
    const edited = await editWatched(prisma, ventureId, first!.id, {
      nameAsTyped: "Invented Shop A (renamed)",
      url: null,
      note: "A new note.",
      adLinks: [
        { url: "https://example.com/ad/1", seenOn: "2026-10-01" },
        { url: "http://example.com/ad/2", seenOn: "2026-10-02" },
      ],
    });
    expect(edited).toMatchObject({ id: first!.id, nameAsTyped: "Invented Shop A (renamed)", url: null, note: "A new note.", addedOn: first!.addedOn });
    expect(edited.adLinks).toHaveLength(2);
    const list = await listWatched(prisma, ventureId);
    expect(list[0]).toEqual(edited);
    expect(list.map((b) => b.id)).toEqual([first!.id, list[1]!.id, list[2]!.id]);
  });

  it("an edit is refused the same way an add is, and leaves the business as it was", async () => {
    const [first] = await listWatched(prisma, ventureId);
    await expect(editWatched(prisma, ventureId, first!.id, { nameAsTyped: "Fine", url: "javascript:alert(1)" })).rejects.toThrow(WatchedInputError);
    await expect(editWatched(prisma, ventureId, first!.id, { nameAsTyped: "" })).rejects.toThrow(WatchedInputError);
    expect((await listWatched(prisma, ventureId))[0]).toEqual(first);
  });

  it("a business is edited or removed only through its own idea", async () => {
    const [first] = await listWatched(prisma, ventureId);
    await expect(editWatched(prisma, otherVentureId, first!.id, { nameAsTyped: "Taken over" })).rejects.toThrow(WatchedNotFoundError);
    await expect(removeWatched(prisma, otherVentureId, first!.id)).rejects.toThrow(WatchedNotFoundError);
    await expect(removeWatched(prisma, ventureId, "no-such-business")).rejects.toThrow(WatchedNotFoundError);
    expect((await listWatched(prisma, ventureId))[0]).toEqual(first);
  });

  it("removes one business, and only that one", async () => {
    const before = await listWatched(prisma, ventureId);
    await removeWatched(prisma, ventureId, before[1]!.id);
    expect((await listWatched(prisma, ventureId)).map((b) => b.id)).toEqual([before[0]!.id, before[2]!.id]);
  });

  it("an idea that isn't there has no list", async () => {
    await expect(listWatched(prisma, "no-such-idea")).rejects.toThrow(VentureNotFoundError);
    await expect(addWatched(prisma, "no-such-idea", { nameAsTyped: "Invented" })).rejects.toThrow(VentureNotFoundError);
  });

  it("holds up to its cap per idea, so a runaway loop can't fill the file", async () => {
    const scratch = (await ensureVentureFromScenario(prisma, { ...demoScenarios[0], id: `scratch-${randomUUID()}` })).ventureId;
    await prisma.watchedBusiness.createMany({
      data: Array.from({ length: WATCHED_PER_IDEA_MAX }, (_, i) => ({ ventureId: scratch, nameAsTyped: `Invented ${i}` })),
    });
    await expect(addWatched(prisma, scratch, { nameAsTyped: "One more" })).rejects.toThrow(WatchedInputError);
    await prisma.venture.delete({ where: { id: scratch } });
  });

  it("reads a hand-edited row safely: a link that isn't http or https, or a broken ad link, is never handed back", async () => {
    const row = await prisma.watchedBusiness.create({
      data: {
        ventureId: otherVentureId,
        nameAsTyped: "Invented, hand-edited",
        url: "javascript:alert(1)",
        adLinks: [{ url: "data:text/html,x", seenOn: "2026-10-01" }, { url: "https://example.com/ok", seenOn: "2026-10-01" }, "junk", { seenOn: 5 }],
      },
    });
    const read = (await listWatched(prisma, otherVentureId)).find((b) => b.id === row.id)!;
    expect(read.url).toBeNull();
    expect(read.adLinks).toEqual([{ url: "https://example.com/ok", seenOn: "2026-10-01" }]);
  });

  it("goes with the idea: deleting the idea deletes its list, and no other", async () => {
    const scratch = (await ensureVentureFromScenario(prisma, { ...demoScenarios[1], id: `scratch-${randomUUID()}` })).ventureId;
    await addWatched(prisma, scratch, { nameAsTyped: "Invented, deleted with the idea" });
    const others = await prisma.watchedBusiness.count({ where: { ventureId: { not: scratch } } });
    await prisma.venture.delete({ where: { id: scratch } });
    expect(await prisma.watchedBusiness.count({ where: { ventureId: scratch } })).toBe(0);
    expect(await prisma.watchedBusiness.count()).toBe(others);
  });
});

const fromPage = { "sec-fetch-site": "same-origin" };
const json = { "content-type": "application/json" };
const listParams = (id: string): ListParams => ({ params: Promise.resolve({ id }) });
const oneParams = (id: string, businessId: string): OneParams => ({ params: Promise.resolve({ id, businessId }) });
const post = (url: string, body: unknown, headers: Record<string, string> = { ...json, ...fromPage }) =>
  new Request(`http://localhost${url}`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
const get = (url: string, headers: Record<string, string> = fromPage) => new Request(`http://localhost${url}`, { headers });

describe("the routes: list, add, edit and remove, from DotAmi's own window only", () => {
  let routeIdea: string;
  beforeAll(async () => {
    routeIdea = (await ensureVentureFromScenario(prisma, { ...demoScenarios[0], id: `routes-${randomUUID()}` })).ventureId;
  });
  const base = () => `/api/futures/${routeIdea}/watched`;
  const list = async () => {
    const res = await routes.list(get(base()), listParams(routeIdea));
    expect(res.status).toBe(200);
    return ((await res.json()) as { businesses: { id: string; nameAsTyped: string; url: string | null }[] }).businesses;
  };

  it("adds, lists, edits and removes", async () => {
    expect(await list()).toEqual([]);
    const added = await routes.add(
      post(base(), { nameAsTyped: "Invented Route Shop", url: "https://example.com", adLinks: [{ url: "https://example.com/ad", seenOn: "2026-10-03" }] }),
      listParams(routeIdea),
    );
    expect(added.status).toBe(200);
    const { business } = (await added.json()) as { business: { id: string } };
    expect((await list()).map((b) => b.nameAsTyped)).toEqual(["Invented Route Shop"]);

    const edited = await routes.edit(post(`${base()}/${business.id}`, { nameAsTyped: "Invented Route Shop, edited", note: "my note" }), oneParams(routeIdea, business.id));
    expect(edited.status).toBe(200);
    expect(((await edited.json()) as { business: { nameAsTyped: string; url: string | null } }).business).toMatchObject({ nameAsTyped: "Invented Route Shop, edited", url: null });

    const removed = await routes.remove(post(`${base()}/${business.id}/remove`, {}), oneParams(routeIdea, business.id));
    expect(removed.status).toBe(200);
    expect(await list()).toEqual([]);
  });

  it("refuses a javascript:, data: or file: link with a 400, and keeps nothing", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,<b>x</b>", "file:///etc/passwd"]) {
      const res = await routes.add(post(base(), { nameAsTyped: "Invented", url }), listParams(routeIdea));
      expect(res.status, url).toBe(400);
      const bad = await routes.add(post(base(), { nameAsTyped: "Invented", adLinks: [{ url, seenOn: "2026-10-01" }] }), listParams(routeIdea));
      expect(bad.status, url).toBe(400);
    }
    expect(await list()).toEqual([]);
  });

  it("answers only DotAmi's own window: a program or another site is refused before anything is read or kept", async () => {
    for (const site of [undefined, "cross-site", "same-site", "none"]) {
      const headers: Record<string, string> = { ...json, ...(site ? { "sec-fetch-site": site } : {}) };
      expect((await routes.add(post(base(), { nameAsTyped: "Invented, from outside" }, headers), listParams(routeIdea))).status, String(site)).toBe(403);
      expect((await routes.list(get(base(), site ? { "sec-fetch-site": site } : {}), listParams(routeIdea))).status, String(site)).toBe(403);
      expect((await routes.edit(post(`${base()}/x`, { nameAsTyped: "x" }, headers), oneParams(routeIdea, "x"))).status).toBe(403);
      expect((await routes.remove(post(`${base()}/x/remove`, {}, headers), oneParams(routeIdea, "x"))).status).toBe(403);
    }
    expect(await list()).toEqual([]);
  });

  it("reads the body through the size cap and as JSON only", async () => {
    const big = await routes.add(post(base(), { nameAsTyped: "Invented", note: "x".repeat(200 * 1024) }), listParams(routeIdea));
    expect(big.status).toBe(413);
    const notJson = await routes.add(post(base(), "{not json", { ...json, ...fromPage }), listParams(routeIdea));
    expect(notJson.status).toBe(400);
    const wrongType = await routes.add(post(base(), { nameAsTyped: "Invented" }, { "content-type": "text/plain", ...fromPage }), listParams(routeIdea));
    expect(wrongType.status).toBe(415);
  });

  it("a business or idea that isn't there is a 404", async () => {
    expect((await routes.edit(post(`${base()}/nope`, { nameAsTyped: "x" }), oneParams(routeIdea, "nope"))).status).toBe(404);
    expect((await routes.remove(post(`${base()}/nope/remove`, {}), oneParams(routeIdea, "nope"))).status).toBe(404);
    expect((await routes.list(get("/api/futures/no-such-idea/watched"), listParams("no-such-idea"))).status).toBe(404);
  });

  it("is rate limited, in its own bucket", async () => {
    let last = 200;
    for (let i = 0; i < 200 && last !== 429; i++) {
      last = (await routes.add(post(base(), { nameAsTyped: "" }), listParams(routeIdea))).status;
    }
    expect(last).toBe(429);
    // The reads count in a bucket of their own, so they still answer.
    expect((await routes.list(get(base()), listParams(routeIdea))).status).toBe(200);
  });
});
