/**
 * Pick a future's three steps, below the screen (tasks 28b, 23g; docs/ui-spec/futures/01, 02, 03): the flow and
 * its back link (lib/front-door/three-steps.ts), step 3's order (lib/front-door/road-match.ts), what the first
 * save keeps (lib/db/parse-scenario-input.ts `parseFirstSave`, lib/db/ensure-venture-from-scenario.ts), the
 * search's route (app/api/jobs/search/route.ts), and the steps as drawn (components/front-door/job-and-road-steps.tsx).
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { JobAndRoadSteps } from "@/components/front-door/job-and-road-steps";
import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseFirstSave } from "@/lib/db/parse-scenario-input";
import { generalRoadV2026, roadApprenticeToOwnShopAB, roadsV2026 } from "@/lib/engines/roads/v2026";
import { listedRoads } from "@/lib/front-door/futures";
import { roadJobNames } from "@/lib/front-door/road-jobs";
import { roadMatch } from "@/lib/front-door/road-match";
import { answersOf, back, backLabel, FIRST_STEP, next, pickedJob, skipped, type StepsState } from "@/lib/front-door/three-steps";
import { areaLabel, regionLabel } from "@/lib/front-door/where";
import { jobStepWords, pickWords, whereStepWords } from "@/lib/front-door/words";
import { readFuture } from "@/lib/futures/future";
import { SHIPPED_ROADS_CATALOG } from "@/lib/futures/types";
import { withTheSteps } from "@/lib/journey/first-save";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

const LISTED = listedRoads(roadsV2026);
const CABINETMAKERS = { code: "72311.00", label: "Cabinetmakers" };
const BARBERS = { code: "63210.02", label: "Barbers" };
const NOW = new Date("2026-10-22T12:00:00Z");

describe("step 3's order: the road written for the picked job first, never a fallback", () => {
  it("case A: a job a road is written for", () => {
    const match = roadMatch(CABINETMAKERS.code, LISTED);
    expect(match.case).toBe("written");
    expect(match.forJob.map((r) => r.id)).toEqual([roadApprenticeToOwnShopAB.id]);
    expect(match.others.map((r) => r.id)).toEqual([generalRoadV2026.id]);
  });

  it("case B: a job no road is written for lists every road as the others, and none as written for it", () => {
    const match = roadMatch(BARBERS.code, LISTED);
    expect(match.case).toBe("no-road");
    expect(match.forJob).toEqual([]);
    expect(match.others.map((r) => r.id)).toEqual(LISTED.map((r) => r.id));
  });

  it("case C: no job picked lists every road in the order written", () => {
    expect(roadMatch(null, LISTED)).toEqual({ case: "skipped", forJob: [], others: LISTED });
  });
});

describe("the flow: one part at a time, the back link one part back, answers kept in memory", () => {
  const picked = (province: string | null) => pickedJob(FIRST_STEP, CABINETMAKERS, province);

  it("in Alberta: work, area, region, road; back retraces each part and keeps every answer", () => {
    let s: StepsState = picked("AB");
    expect(s.part).toBe("area");
    expect(backLabel(s, "AB", "first")).toBe(jobStepWords.changePick);
    s = next({ ...s, area: "cma-825" });
    expect(s.part).toBe("region");
    expect(backLabel(s, "AB", "first")).toBe(whereStepWords.area.back);
    s = next({ ...s, region: "4830" });
    expect(s.part).toBe("road");
    expect(backLabel(s, "AB", "first")).toBe(pickWords.backToRegion);
    const backOnce = back(s, "AB")!;
    expect(backOnce).toEqual({ part: "region", job: CABINETMAKERS, area: "cma-825", region: "4830" });
    expect(back(back(backOnce, "AB")!, "AB")).toMatchObject({ part: "work", job: CABINETMAKERS });
    expect(back(FIRST_STEP, "AB")).toBeNull();
    expect(backLabel(FIRST_STEP, "AB", "← Your destination")).toBe("← Your destination");
    expect(answersOf(s, "AB")).toEqual({ job: "72311.00", area: "cma-825", region: "4830" });
  });

  it("outside Alberta: one part that asks nothing, so no area and no region are ever handed to the save", () => {
    const s = picked("ON");
    expect(s.part).toBe("outside");
    const road = next(s);
    expect(road.part).toBe("road");
    expect(backLabel(road, "ON", "first")).toBe(pickWords.backToWhere);
    // Even with an area or region left in memory from an earlier place, the save gets neither.
    expect(answersOf({ ...road, area: "cma-825", region: "4830" }, "ON")).toEqual({ job: "72311.00", area: null, region: null });
  });

  it("Skip: no job, so no area or region, straight to the futures; back goes to the work", () => {
    const s = skipped();
    expect(s).toEqual({ part: "road", job: null, area: null, region: null });
    expect(backLabel(s, "AB", "first")).toBe(pickWords.backToWork);
    expect(back(s, "AB")).toMatchObject({ part: "work" });
    expect(answersOf({ ...s, area: "cma-825", region: "4830" }, "AB")).toEqual({ job: null, area: null, region: null });
  });
});

describe("what the first save keeps", () => {
  it("adds the road opened and only the answers given", () => {
    expect(withTheSteps({}, "road-x", { job: null, area: null, region: null })).toEqual({ roadId: "road-x" });
    expect(withTheSteps({}, "road-x", { job: "72311.00", area: "dont-know", region: "4830" })).toEqual({
      roadId: "road-x",
      job: "72311.00",
      area: "dont-know",
      region: "4830",
    });
    // No job, no area or region, whatever was sent.
    expect(withTheSteps({}, "road-x", { job: null, area: "cma-825", region: "4830" })).toEqual({ roadId: "road-x" });
  });

  it("the server keeps a job only from the government's list, and the area and region only beside it, in Alberta, from the lists offered", () => {
    expect(parseFirstSave({ job: "72311.00", area: "cma-825", region: "4830" }, NOW, "AB")).toEqual({ job: "72311.00", area: "cma-825", region: "4830" });
    expect(parseFirstSave({ job: "72311.00", area: "dont-know", region: "dont-know" }, NOW, "AB")).toMatchObject({ area: "dont-know", region: "dont-know" });
    // Not a job on the list: nothing of the three.
    expect(parseFirstSave({ job: "99999.99", area: "cma-825", region: "4830" }, NOW, "AB")).toEqual({});
    expect(parseFirstSave({ area: "cma-825", region: "4830" }, NOW, "AB")).toEqual({});
    // Outside Alberta neither question is asked, so neither answer is kept.
    expect(parseFirstSave({ job: "72311.00", area: "cma-825", region: "4830" }, NOW, "ON")).toEqual({ job: "72311.00" });
    // Answers the drop-downs don't offer are dropped, never turned into one.
    expect(parseFirstSave({ job: "72311.00", area: "Calgary", region: "5930" }, NOW, "AB")).toEqual({ job: "72311.00" });
  });

  describe("in the data file", () => {
    const dbFile = path.join(tmpdir(), `dotami-three-steps-${randomUUID()}.db`);
    let prisma: PrismaClient;
    beforeAll(() => {
      migratedFile(dbFile);
      prisma = createDatabaseClient({ url: fileUrl(dbFile) });
    }, 120_000);
    afterAll(async () => {
      await prisma?.$disconnect();
      for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
    });

    it("keeps each answer with its moment on the idea it creates; a later save never moves them; the region is never filled from the area", async () => {
      const scenario = { ...demoScenarios[0], id: `scenario-${randomUUID()}`, profile: { ...demoScenarios[0].profile, province: "AB" as const } };
      const firstSave = parseFirstSave({ job: "72311.00", area: "cma-825", roadId: roadApprenticeToOwnShopAB.id }, NOW, "AB");
      const { ventureId } = await ensureVentureFromScenario(prisma, scenario, { ...firstSave, roadId: roadApprenticeToOwnShopAB.id });
      const future = await readFuture(prisma, ventureId, SHIPPED_ROADS_CATALOG);
      expect(future.job).toMatchObject({ code: "72311.00" });
      expect(future.area).toMatchObject({ value: "cma-825" });
      expect(future.area!.setOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Calgary's area sits wholly in the Calgary region, and still no region is kept: the person didn't pick one.
      expect(future.region).toBeNull();
      // A later save of the same idea carries other answers: nothing moves.
      await ensureVentureFromScenario(prisma, scenario, { job: "63210.02", area: "dont-know", region: "4810" });
      const again = await readFuture(prisma, ventureId, SHIPPED_ROADS_CATALOG);
      expect(again.job).toMatchObject({ code: "72311.00" });
      expect(again.area).toMatchObject({ value: "cma-825" });
      expect(again.region).toBeNull();
    });
  });
});

describe("the words shown back", () => {
  it("name each answer as its drop-down does, with an en dash for the published double hyphen", () => {
    expect(areaLabel("cma-835")).toBe("Edmonton");
    expect(areaLabel("ab-elsewhere")).toBe("Somewhere else in Alberta");
    expect(areaLabel("Edmonton")).toBeNull();
    expect(regionLabel("4810", "AB")).toBe("Lethbridge–Medicine Hat");
    expect(regionLabel("dont-know", "AB")).toBe("I don't know");
    expect(regionLabel("4810", "ON")).toBeNull();
  });
});

describe("the search's route (POST /api/jobs/search)", () => {
  afterEach(() => __resetRateLimitStateForTests());
  const post = (body: unknown) =>
    new Request("http://localhost/api/jobs/search", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    });

  it("answers with the grouped search, and refuses anything but words", async () => {
    const { POST } = await import("@/app/api/jobs/search/route");
    const res = await POST(post({ query: "cabinetmaker" }));
    expect(res.status).toBe(200);
    const { search } = (await res.json()) as { search: { state: string; groups: { kind: string; jobs: { code: string }[] }[] } };
    expect(search.state).toBe("results");
    expect(search.groups[0]!.jobs.map((j) => j.code)).toContain("72311.00");
    expect((await POST(post({ query: 7 }))).status).toBe(400);
    expect((await POST(post({ query: "a".repeat(501) }))).status).toBe(400);
  });
});

describe("the steps as drawn", () => {
  const roadJobs = roadJobNames(LISTED);
  const draw = (host: "futures" | "intake", state: StepsState, place: "CA-AB" | "CA-ON" = "CA-AB") =>
    renderToStaticMarkup(
      createElement(JobAndRoadSteps, { host, state, setState: () => {}, place, listed: LISTED, roadJobs, onLookInside: async () => false }),
    );
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  it("step 1: the box, Skip, and no job listed or picked before a click", () => {
    const html = draw("futures", FIRST_STEP);
    expect(html).toContain(esc(jobStepWords.heading));
    expect(html).toContain('type="search"');
    expect(html).toContain(esc(jobStepWords.skip));
    expect(html).not.toContain("Pick Cabinetmakers");
    expect(html).toContain('data-region="step"');
  });

  it("step 3, case B: the honest heading, About this job's marked place, the general road not written for the job, nothing written for it", () => {
    const html = draw("futures", { part: "road", job: BARBERS, area: null, region: null });
    expect(html).toContain(esc(pickWords.noRoad.heading(BARBERS.label, BARBERS.code)));
    expect(html).toContain(`data-about-this-job-slot="${BARBERS.code}"`);
    expect(html).toContain(esc(pickWords.noRoad.nothingSaved));
    expect(html).toContain(esc(pickWords.road0NotForJob(BARBERS.label)));
    expect(html).not.toContain(esc(pickWords.writtenForJobHeading));
    // The design's lead sentence waits for About this job's rows (task 25h).
    expect(html).not.toContain(esc(pickWords.noRoad.governmentLead));
  });

  it("step 3, case A: the road written for the job under its own heading, before the others", () => {
    const html = draw("futures", { part: "road", job: CABINETMAKERS, area: "cma-825", region: "4830" });
    const written = html.indexOf(esc(pickWords.writtenForJobHeading));
    const others = html.indexOf(esc(pickWords.othersHeading));
    expect(written).toBeGreaterThan(-1);
    expect(others).toBeGreaterThan(written);
    expect(html.indexOf(esc(roadApprenticeToOwnShopAB.label))).toBeLessThan(others);
    expect(html).toContain(esc(pickWords.writtenForJob("Cabinetmakers", "72311")));
  });

  it("on the intake page: no region marks of its own and no Name it box", () => {
    for (const state of [FIRST_STEP, { part: "road", job: BARBERS, area: null, region: null } as StepsState]) {
      const html = draw("intake", state);
      expect(html).not.toContain("data-region=");
      expect(html).not.toContain(esc(pickWords.nameIt));
    }
  });

  it("outside Alberta: step 2 asks nothing and says why", () => {
    const html = draw("futures", { part: "outside", job: CABINETMAKERS, area: null, region: null }, "CA-ON");
    expect(html).toContain(esc(whereStepWords.outside.notAsked("Ontario")));
    expect(html).not.toContain("<select");
    expect(html).not.toContain(esc(whereStepWords.kept));
  });

  it("2b: Statistics Canada's list is drawn only once “I don't know” is picked", () => {
    const at = (region: string | null) => draw("futures", { part: "region", job: CABINETMAKERS, area: "cma-825", region });
    expect(at(null)).not.toContain("statcan.gc.ca");
    expect(at("4830")).not.toContain("statcan.gc.ca");
    expect(at("dont-know")).toContain("statcan.gc.ca");
  });
});
