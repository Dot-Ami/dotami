/**
 * The cockpit's routes (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built"): one read of
 * what the cockpit keeps for an idea, and three writes, each the person's own click: a step's status or
 * ticks, their month, and a skill mark. Run against a throwaway migrated data file through the route
 * handlers themselves, the way tests/figures.spec.ts runs the figures routes.
 *
 * Each write answers only DotAmi's own window (Sec-Fetch-Site: same-origin), reads its body through
 * readJsonWithLimit (JSON only, size capped) and is rate limited.
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
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "@/lib/engines/roads/v2026";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

const dbFile = path.join(tmpdir(), `dotami-cockpit-routes-${randomUUID()}.db`);
const previousUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;
let ventureId: string;

type Params = { params: Promise<{ id: string }> };
type IdRoute = (request: Request, context: Params) => Promise<Response>;
const routes = {} as { future: IdRoute; progress: IdRoute; date: IdRoute; ending: IdRoute; job: IdRoute; marks: (request: Request) => Promise<Response> };

beforeAll(async () => {
  migratedFile(dbFile);
  // The routes build their own client from DATABASE_URL when first imported.
  process.env.DATABASE_URL = fileUrl(dbFile);
  prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  routes.future = (await import("@/app/api/futures/[id]/route")).GET;
  routes.progress = (await import("@/app/api/futures/[id]/progress/route")).POST;
  routes.date = (await import("@/app/api/futures/[id]/date/route")).POST;
  routes.ending = (await import("@/app/api/futures/[id]/ending/route")).POST;
  routes.job = (await import("@/app/api/futures/[id]/job/route")).POST;
  routes.marks = (await import("@/app/api/skill-marks/route")).POST;
  ventureId = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
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

const fromPage = { "sec-fetch-site": "same-origin" };
const json = { "content-type": "application/json" };
const params = (id: string): Params => ({ params: Promise.resolve({ id }) });
const post = (url: string, body: unknown, headers: Record<string, string> = { ...json, ...fromPage }) =>
  new Request(`http://localhost${url}`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
const read = async (id = ventureId) => {
  const res = await routes.future(new Request(`http://localhost/api/futures/${id}`), params(id));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

const STEP = "stage-1-sole-prop-activation";

describe("GET /api/futures/<id>: what the cockpit keeps for one idea", () => {
  it("an idea saved before roads: today's general road, nothing told yet, and its first sentence word for word", async () => {
    await prisma.personStatement.create({
      data: {
        text: "Invented first sentence  with “quotes”",
        saidAt: new Date("2026-10-10T00:00:00.000Z"),
        ventureId,
        userId: (await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } })).userId,
      },
    });
    const { status, body } = await read();
    expect(status).toBe(200);
    expect(body.future).toMatchObject({ ventureId, roadId: generalRoadV2026.id, roadChosen: false, targetMonth: null });
    expect(body.progress).toEqual([]);
    expect(body.skillMarks).toEqual([]);
    expect(body.incomeWanted).toBeNull();
    expect(body.firstWords).toEqual({ text: "Invented first sentence  with “quotes”", saidAt: "2026-10-10" });
  });

  it("an idea that isn't there is a 404", async () => {
    expect((await read("no-such-idea")).status).toBe(404);
  });
});

describe("POST /api/futures/<id>/progress: a step's status and ticks", () => {
  it("keeps the person's status on a road 0 step, and gives it back on the next read", async () => {
    const res = await routes.progress(post(`/api/futures/${ventureId}/progress`, { roadId: generalRoadV2026.id, stepId: STEP, status: "done" }), params(ventureId));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { progress: { status: string } }).progress.status).toBe("done");
    expect((await read()).body.progress).toEqual([expect.objectContaining({ stepId: STEP, status: "done" })]);
  });

  it("refuses a step that isn't on the road and a status it doesn't know, with nothing kept", async () => {
    for (const body of [
      { roadId: generalRoadV2026.id, stepId: "step-nobody-wrote", status: "done" },
      { roadId: generalRoadV2026.id, stepId: STEP, status: "finished" },
      { roadId: "road-nobody-wrote", stepId: STEP, status: "done" },
    ]) {
      const res = await routes.progress(post(`/api/futures/${ventureId}/progress`, body), params(ventureId));
      expect(res.status).toBe(400);
    }
    expect((await read()).body.progress).toEqual([expect.objectContaining({ stepId: STEP, status: "done" })]);
  });

  it("answers only DotAmi's own window: a program or another site is refused before anything is read", async () => {
    for (const site of [undefined, "cross-site", "same-site", "none"]) {
      const headers: Record<string, string> = { ...json, ...(site ? { "sec-fetch-site": site } : {}) };
      const res = await routes.progress(
        post(`/api/futures/${ventureId}/progress`, { roadId: generalRoadV2026.id, stepId: STEP, status: "not-for-me" }, headers),
        params(ventureId),
      );
      expect(res.status).toBe(403);
    }
    expect((await read()).body.progress).toEqual([expect.objectContaining({ status: "done" })]);
  });

  it("reads JSON only, and no more than its cap", async () => {
    const text = await routes.progress(post(`/api/futures/${ventureId}/progress`, "{}", { "content-type": "text/plain", ...fromPage }), params(ventureId));
    expect(text.status).toBe(415);
    const big = await routes.progress(
      post(`/api/futures/${ventureId}/progress`, { roadId: generalRoadV2026.id, stepId: STEP, doneWhenIds: ["x".repeat(64 * 1024)] }),
      params(ventureId),
    );
    expect(big.status).toBe(413);
  });

  it("an idea that isn't there is a 404", async () => {
    const res = await routes.progress(post("/api/futures/no-such-idea/progress", { roadId: generalRoadV2026.id, stepId: STEP, status: "done" }), params("no-such-idea"));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/futures/<id>/date: the person's own month", () => {
  it("keeps a month and year, refuses one already gone, and clears it", async () => {
    const res = await routes.date(post(`/api/futures/${ventureId}/date`, { month: "2099-05" }), params(ventureId));
    expect(res.status).toBe(200);
    expect((await read()).body.future).toMatchObject({ targetMonth: "2099-05" });
    const gone = await routes.date(post(`/api/futures/${ventureId}/date`, { month: "2001-01" }), params(ventureId));
    expect(gone.status).toBe(400);
    expect(((await gone.json()) as { error: string }).error).toBe("That month has already gone.");
    expect((await read()).body.future).toMatchObject({ targetMonth: "2099-05" });
    await routes.date(post(`/api/futures/${ventureId}/date`, { month: null }), params(ventureId));
    expect((await read()).body.future).toMatchObject({ targetMonth: null });
  });

  it("answers only DotAmi's own window", async () => {
    const res = await routes.date(post(`/api/futures/${ventureId}/date`, { month: "2099-05" }, json), params(ventureId));
    expect(res.status).toBe(403);
    expect((await read()).body.future).toMatchObject({ targetMonth: null });
  });
});

describe("POST /api/futures/<id>/job: the job closest to the person's work", () => {
  it("keeps a job from the dataset, gives it back on the next read, and takes it back", async () => {
    const res = await routes.job(post(`/api/futures/${ventureId}/job`, { code: "72311.00" }), params(ventureId));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { future: { job: unknown } }).future.job).toMatchObject({ code: "72311.00", label: "Cabinetmakers" });
    expect((await read()).body.future).toMatchObject({ job: { code: "72311.00", label: "Cabinetmakers" } });
    expect((await routes.job(post(`/api/futures/${ventureId}/job`, { code: null }), params(ventureId))).status).toBe(200);
    expect((await read()).body.future).toMatchObject({ job: null });
  });

  it("gives About this job for the picked job on the next read (built on the server), and none while no job is picked", async () => {
    expect((await read()).body).toMatchObject({ aboutJob: null });
    await routes.job(post(`/api/futures/${ventureId}/job`, { code: "72311.00" }), params(ventureId));
    const about = (await read()).body.aboutJob as { job: unknown; group: unknown; wages: { context: unknown }; area: unknown };
    expect(about.job).toEqual({ code: "72311.00", label: "Cabinetmakers" });
    expect(about.group).toEqual({ code: "72311", title: "Cabinetmakers" });
    // This idea keeps no region or area: read as not picked.
    expect(about.wages.context).toEqual({ kind: "not-picked" });
    expect(about.area).toBeNull();
    await routes.job(post(`/api/futures/${ventureId}/job`, { code: null }), params(ventureId));
    expect((await read()).body).toMatchObject({ aboutJob: null });
  });

  it("About this job reads the region and area the idea keeps (Pick a future's step 2): the region's own row; I don't know and outside Alberta the place's", async () => {
    type About = { wages: { context: unknown; shown: { kind: string; row?: { geography: { code: string }; low: string; median: string; high: string } } }; area: unknown };
    const about = async () => (await read()).body.aboutJob as About;
    const rowOf = (a: About) => ({ code: a.wages.shown.row?.geography.code, low: a.wages.shown.row?.low, median: a.wages.shown.row?.median, high: a.wages.shown.row?.high });
    const keep = (data: { province?: "AB" | "ON"; landscapeArea: string | null; economicRegion: string | null }) =>
      prisma.venture.update({ where: { id: ventureId }, data });
    await routes.job(post(`/api/futures/${ventureId}/job`, { code: "72311.00" }), params(ventureId));
    try {
      // Calgary picked as the area and as the region, each by the person (the route never derives one).
      await keep({ landscapeArea: "cma-825", economicRegion: "4830" });
      let a = await about();
      expect(a.wages.context).toEqual({ kind: "region", region: "Calgary" });
      expect(rowOf(a)).toEqual({ code: "ER4830", low: "18", median: "23", high: "30" });
      expect(a.area).toBe("Calgary");

      // Edmonton's region with the area left at Calgary: Edmonton's own row.
      await keep({ landscapeArea: "cma-825", economicRegion: "4860" });
      a = await about();
      expect(a.wages.context).toEqual({ kind: "region", region: "Edmonton" });
      expect(rowOf(a)).toEqual({ code: "ER4860", low: "18", median: "23", high: "29" });

      // An area and no region: no region, never one worked out from the area.
      await keep({ landscapeArea: "cma-825", economicRegion: null });
      a = await about();
      expect(a.wages.context).toEqual({ kind: "not-picked" });
      expect(rowOf(a).code).toBe("ER48");

      // I don't know: Alberta's own row, because they said so.
      await keep({ landscapeArea: "dont-know", economicRegion: "dont-know" });
      a = await about();
      expect(a.wages.context).toEqual({ kind: "dont-know" });
      expect(rowOf(a).code).toBe("ER48");
      expect(a.area).toBe("I don't know");

      // Outside Alberta nothing is asked: the province's own row, and no area, whatever the file holds.
      await keep({ province: "ON", landscapeArea: "cma-825", economicRegion: "4830" });
      a = await about();
      expect(a.wages.context).toEqual({ kind: "outside-alberta", place: "Ontario" });
      expect(rowOf(a).code).toBe("ER35");
      expect(a.area).toBeNull();
    } finally {
      await keep({ province: "AB", landscapeArea: null, economicRegion: null });
      await routes.job(post(`/api/futures/${ventureId}/job`, { code: null }), params(ventureId));
    }
  });

  it("refuses a code that isn't a job, and a body without one, with nothing kept", async () => {
    for (const body of [{ code: "99999.99" }, { code: 72311 }, {}]) {
      expect((await routes.job(post(`/api/futures/${ventureId}/job`, body), params(ventureId))).status).toBe(400);
    }
    expect((await read()).body.future).toMatchObject({ job: null });
  });

  it("answers only DotAmi's own window, reads JSON only, and an idea that isn't there is a 404", async () => {
    for (const site of [undefined, "cross-site", "same-site", "none"]) {
      const headers: Record<string, string> = { ...json, ...(site ? { "sec-fetch-site": site } : {}) };
      expect((await routes.job(post(`/api/futures/${ventureId}/job`, { code: "72311.00" }, headers), params(ventureId))).status).toBe(403);
    }
    expect((await routes.job(post(`/api/futures/${ventureId}/job`, "{}", { "content-type": "text/plain", ...fromPage }), params(ventureId))).status).toBe(415);
    expect((await routes.job(post("/api/futures/no-such-idea/job", { code: "72311.00" }), params("no-such-idea"))).status).toBe(404);
    expect((await read()).body.future).toMatchObject({ job: null });
  });
});

describe("POST /api/skill-marks: the person's mark on a skill", () => {
  it("keeps a mark on a skill of the person's own, and 'I don't know' removes it", async () => {
    const res = await routes.marks(post("/api/skill-marks", { ownLabel: "Welding (invented)", mark: "have" }));
    expect(res.status).toBe(200);
    expect((await read()).body.skillMarks).toEqual([expect.objectContaining({ ownLabel: "Welding (invented)", mark: "have", skillItemId: null })]);
    const cleared = await routes.marks(post("/api/skill-marks", { ownLabel: "welding (INVENTED)", mark: null }));
    expect(cleared.status).toBe(200);
    expect(((await cleared.json()) as { mark: unknown }).mark).toBeNull();
    expect((await read()).body.skillMarks).toEqual([]);
  });

  it("refuses a skill that isn't on DotAmi's list, and a mark it doesn't know", async () => {
    for (const body of [{ skillItemId: "skill-nobody-wrote", mark: "have" }, { ownLabel: "Welding", mark: "expert" }, {}]) {
      expect((await routes.marks(post("/api/skill-marks", body))).status).toBe(400);
    }
    expect((await read()).body.skillMarks).toEqual([]);
  });

  it("answers only DotAmi's own window", async () => {
    expect((await routes.marks(post("/api/skill-marks", { ownLabel: "Welding", mark: "have" }, json))).status).toBe(403);
    expect((await read()).body.skillMarks).toEqual([]);
  });

  it("is rate limited: a runaway caller is told to wait", async () => {
    const statuses: number[] = [];
    // Refused at the first check, so nothing is written; the limit counts it all the same.
    for (let i = 0; i < 125; i++) statuses.push((await routes.marks(post("/api/skill-marks", {}))).status);
    expect(statuses.slice(0, 120).every((s) => s === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("POST /api/futures/<id>/ending: This is mine at a fork (2026-10-12, part 2)", () => {
  const fork = roadApprenticeToOwnShopAB.forks[0]!;
  const [stayEmployed, ownShop] = fork.sides;
  const onRoad1 = async () => {
    const id = (await ensureVentureFromScenario(prisma, { ...demoScenarios[0], id: `ending-${randomUUID()}` })).ventureId;
    await prisma.venture.update({ where: { id }, data: { roadId: roadApprenticeToOwnShopAB.id, roadChosenAt: new Date() } });
    return id;
  };

  it("keeps the side picked, with its day, and gives it back on the next read; null takes it back", async () => {
    const id = await onRoad1();
    const res = await routes.ending(post(`/api/futures/${id}/ending`, { forkId: fork.id, stepId: ownShop }), params(id));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { future: { forkPicks: Record<string, unknown> } }).future.forkPicks[fork.id]).toMatchObject({ stepId: ownShop, from: "you" });
    expect(((await read(id)).body.future as { forkPicks: Record<string, unknown> }).forkPicks[fork.id]).toMatchObject({
      stepId: ownShop,
      from: "you",
      pickedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    const back = await routes.ending(post(`/api/futures/${id}/ending`, { forkId: fork.id, stepId: null }), params(id));
    expect(back.status).toBe(200);
    expect((await read(id)).body.future).toMatchObject({ forkPicks: {} });
    void stayEmployed;
  });

  it("refuses today's road's forks (the map keeps those), a step that isn't a side, and a fork that isn't on the road", async () => {
    const id = await onRoad1();
    for (const body of [
      { forkId: "gstTiming", stepId: "stage-2a-voluntary-gst-registration" },
      { forkId: fork.id, stepId: "step-nobody-wrote" },
      { forkId: "fork-nobody-wrote", stepId: ownShop },
      { stepId: ownShop },
    ]) {
      expect((await routes.ending(post(`/api/futures/${id}/ending`, body), params(id))).status).toBe(400);
    }
    expect((await read(id)).body.future).toMatchObject({ forkPicks: {} });
  });

  it("answers only DotAmi's own window, reads JSON only, and an idea that isn't there is a 404", async () => {
    const id = await onRoad1();
    for (const site of [undefined, "cross-site", "same-site", "none"]) {
      const headers: Record<string, string> = { ...json, ...(site ? { "sec-fetch-site": site } : {}) };
      expect((await routes.ending(post(`/api/futures/${id}/ending`, { forkId: fork.id, stepId: ownShop }, headers), params(id))).status).toBe(403);
    }
    expect((await read(id)).body.future).toMatchObject({ forkPicks: {} });
    expect((await routes.ending(post(`/api/futures/${id}/ending`, "{}", { "content-type": "text/plain", ...fromPage }), params(id))).status).toBe(415);
    expect((await routes.ending(post("/api/futures/no-such-idea/ending", { forkId: fork.id, stepId: ownShop }), params("no-such-idea"))).status).toBe(404);
  });
});
