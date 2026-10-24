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
import { searchJobTitles } from "@/lib/engines/oasis/v2026/title-search";
import {
  citationsForPlace,
  generalRoadV2026,
  roadApprenticeToOwnShopAB,
  roadFederalStepsCA,
  roadForPlace,
  roadsV2026,
  skillItemsV2026,
} from "@/lib/engines/roads/v2026";
import { futureCards, listedRoads, notHereRoad, sourcesLine } from "@/lib/front-door/futures";
import { leftOutLine, onlyLeftOutWords, searchBoxStatusLine, searchStatusLine, showsEnglishOnly } from "@/lib/front-door/job-search-lines";
import { roadJobNames } from "@/lib/front-door/road-jobs";
import { roadMatch } from "@/lib/front-door/road-match";
import { answersOf, back, backLabel, FIRST_STEP, next, pickedJob, skipped, type StepsState } from "@/lib/front-door/three-steps";
import { areaLabel, regionLabel } from "@/lib/front-door/where";
import { jobStepWords, pickWords, whereStepWords } from "@/lib/front-door/words";
import { readFuture } from "@/lib/futures/future";
import { SHIPPED_ROADS_CATALOG } from "@/lib/futures/types";
import { withTheSteps } from "@/lib/journey/first-save";
import { ALBERTA_AREAS } from "@/lib/places/alberta-areas";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

// The roads Pick a future lists in Alberta (outside Alberta the federal steps too, task 28d: `listedAt`).
const LISTED = listedRoads(roadsV2026, "AB");
const listedAt = (place: "CA-AB" | "CA-ON" | "CA-YT") => listedRoads(roadsV2026, place === "CA-ON" ? "ON" : place === "CA-YT" ? "YT" : "AB");
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

  it("leaving 2a never fills the region: every area, and Choose one, goes on to 2b with the region as it was", () => {
    // The region is the person's own answer (spec 02): no area picks one, even an area wholly inside one region
    // (Calgary, Lethbridge, Red Deer). Before this, a region planted from the area was caught only in the browser.
    for (const area of [...ALBERTA_AREAS.map((a) => a.value), null]) {
      const left = next({ ...picked("AB"), area });
      expect(left, String(area)).toEqual({ part: "region", job: CABINETMAKERS, area, region: null });
      expect(answersOf(left, "AB"), String(area)).toEqual({ job: CABINETMAKERS.code, area, region: null });
      // A region picked earlier (then Back to 2a) stays the one they picked, whatever area they pick now.
      expect(next({ ...picked("AB"), area, region: "4860" }), String(area)).toMatchObject({ part: "region", region: "4860" });
    }
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

describe("the search's lines (lib/front-door/job-search-lines.ts, drawn by components/front-door/job-search.tsx)", () => {
  it("only left-out words: says nothing was searched, never that no government title holds them", () => {
    const search = searchJobTitles("my own shop");
    expect(search.state).toBe("no-match");
    expect(onlyLeftOutWords(search)).toBe(true);
    expect(searchStatusLine(search)).toBe(jobStepWords.nothingSearched);
    expect(searchStatusLine(search)).not.toContain("No government example title");
    expect(leftOutLine(search)).toBe(jobStepWords.leftOut("“my”, “own”, “shop”"));
    // Nothing was looked for, so the English-only line, a reason for a miss, isn't drawn either.
    expect(showsEnglishOnly(search)).toBe(false);
    // Why the no-match line would be false here: a government example title holds "shop".
    const barber = searchJobTitles("barber shop").groups.flatMap((g) => g.jobs);
    expect(barber.some((hit) => hit.code === "60040.00" && /\bshop\b/i.test(hit.matched?.title ?? ""))).toBe(true);
  });

  it("words searched and found nowhere: the no-match line names only the words searched", () => {
    const search = searchJobTitles("my infirmière");
    expect(onlyLeftOutWords(search)).toBe(false);
    expect(searchStatusLine(search)).toBe(jobStepWords.noMatch("“infirmiere”"));
    expect(leftOutLine(search)).toBe(jobStepWords.leftOut("“my”"));
    expect(showsEnglishOnly(search)).toBe(true);
  });

  it("the status line says DotAmi is looking while a search waits, with no time words (the PR #202 review)", () => {
    const search = searchJobTitles("baker");
    expect(searchBoxStatusLine({ typed: true, compact: false, failed: false, search: null })).toBe(jobStepWords.searching);
    expect(searchBoxStatusLine({ typed: true, compact: true, failed: false, search: null })).toBe(jobStepWords.searching);
    expect(jobStepWords.searching).not.toMatch(/\b(second|minute|moment|soon|quick|wait|time)s?\b/i);
    expect(searchBoxStatusLine({ typed: true, compact: false, failed: false, search })).toBe(searchStatusLine(search));
    expect(searchBoxStatusLine({ typed: true, compact: false, failed: true, search: null })).toBe(jobStepWords.searchFailed);
    expect(searchBoxStatusLine({ typed: false, compact: false, failed: false, search: null })).toBe(jobStepWords.empty);
    expect(searchBoxStatusLine({ typed: false, compact: true, failed: false, search: null })).toBe("");
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
  const roadJobs = roadJobNames(listedAt("CA-ON"));
  const draw = (host: "futures" | "intake", state: StepsState, place: "CA-AB" | "CA-ON" | "CA-YT" = "CA-AB") =>
    renderToStaticMarkup(
      createElement(JobAndRoadSteps, { host, state, setState: () => {}, place, listed: listedAt(place), roadJobs, onLookInside: async () => false }),
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

  it("step 3, case B: the honest heading, About this job in place (no placeholder), the general road not written for the job, nothing written for it", () => {
    const html = draw("futures", { part: "road", job: BARBERS, area: null, region: null });
    expect(html).toContain(esc(pickWords.noRoad.heading(BARBERS.label, BARBERS.code)));
    expect(html).toContain(`data-about-this-job-slot="${BARBERS.code}"`);
    // Task 28c: the slot reads About this job's rows on DotAmi's own server; until they're in, it says so (a page
    // drawn on the server has no answer yet). The placeholder saying it isn't built is gone.
    expect(html).toContain(esc(pickWords.noRoad.aboutJobReading(BARBERS.label)));
    expect(html).not.toContain("isn&#x27;t built yet");
    expect(html).toContain(esc(pickWords.noRoad.nothingSaved));
    expect(html).toContain(esc(pickWords.road0NotForJob(BARBERS.label)));
    expect(html).not.toContain(esc(pickWords.writtenForJobHeading));
    // The design's lead sentence opens the rows, so it shows only with them.
    expect(html).not.toContain(esc(pickWords.noRoad.governmentLead));
  });

  it("Not here yet? opens the general road in Alberta and the federal steps elsewhere in Canada, and says which (call 33)", () => {
    const ab = draw("futures", skipped(), "CA-AB");
    expect(ab).toContain(esc(pickWords.notHere.button));
    expect(ab).toContain(esc(pickWords.notHere.hint));
    expect(ab).not.toContain(esc(pickWords.notHere.federal.button));
    for (const place of ["CA-ON", "CA-YT"] as const) {
      const html = draw("futures", skipped(), place);
      expect(html, place).toContain(esc(pickWords.notHere.federal.button));
      expect(html, place).toContain(esc(pickWords.notHere.federal.hint));
      expect(html, place).not.toContain(esc(pickWords.notHere.button));
      expect(notHereRoad(listedAt(place), generalRoadV2026).id, place).toBe(roadFederalStepsCA.id);
    }
    expect(notHereRoad(listedAt("CA-AB"), generalRoadV2026).id).toBe(generalRoadV2026.id);
  });

  it("the federal card counts only the source pages that person will be shown inside (call 34), with the step panel's filter", () => {
    const federalFor = (place: "ON" | "YT" | null) => futureCards([roadFederalStepsCA], skillItemsV2026, place)[0]!.sources;
    const total = (c: ReturnType<typeof federalFor>) => c.person + c.unrecorded + c.model + c.tool;
    // Every page the road carries, and the ones an Ontario person is shown: fewer.
    expect(total(federalFor("ON"))).toBeLessThan(total(federalFor(null)));
    // The count is the step panel's: each step's sources through `citationsForPlace` for the place, plus the rest.
    const shown = roadFederalStepsCA.steps.reduce((n, step) => n + citationsForPlace(roadFederalStepsCA, step.citations, "ON").shown.length, 0);
    const all = roadFederalStepsCA.steps.reduce((n, step) => n + step.citations.length, 0);
    expect(total(federalFor(null)) - total(federalFor("ON"))).toBe(all - shown);
    // Every road counts the place's pages only since 2026-10-23 (a-call-12): road 0 in Alberta counts fewer than all.
    const road0 = (place: "AB" | null) => total(futureCards([generalRoadV2026], skillItemsV2026, place)[0]!.sources);
    expect(road0("AB")).toBeLessThan(road0(null));
    // As drawn: the federal card on Pick a future in Ontario carries the place's count.
    const html = draw("futures", skipped(), "CA-ON");
    for (const part of sourcesLine(federalFor("ON"))) expect(html).toContain(esc(part.text));
  });

  it("an Alberta road's card, for a person in another province, counts what the cockpit draws there (second review of #207)", () => {
    const card = (road: (typeof roadsV2026)[number], place: string) => futureCards([road], skillItemsV2026, place)[0]!;
    const total = (c: ReturnType<typeof card>["sources"]) => c.person + c.unrecorded + c.model + c.tool;
    // Every road, in Alberta, Ontario, British Columbia and Yukon: the lines, fees and skills the road drawn for the
    // place holds (`roadForPlace`), as the step panel and the Skills list show them.
    for (const road of roadsV2026) {
      for (const place of ["AB", "ON", "BC", "YT"]) {
        const drawn = roadForPlace(road, place).steps;
        const costs = drawn.flatMap((step) => step.costs);
        expect(
          [card(road, place).linesToPrice, card(road, place).officialFees, card(road, place).skillsListed],
          `${road.id} in ${place}`,
        ).toEqual([
          costs.filter((c) => c.kind === "named").length,
          costs.filter((c) => c.kind === "official-fee").length,
          new Set(drawn.flatMap((step) => step.needs)).size,
        ]);
      }
    }
    // Road 1 from Ontario: 17 lines to price, no official fee and no skill listed, where it said 30, 9 and 3, and the
    // sources of what is drawn there only.
    const road1 = card(roadApprenticeToOwnShopAB, "ON");
    expect([road1.linesToPrice, road1.officialFees, road1.skillsListed, total(road1.sources)]).toEqual([17, 0, 0, 18]);
    // Road 0 from Ontario: 9 lines to price, where it said 11 (the Alberta name registry's two).
    expect(card(generalRoadV2026, "ON").linesToPrice).toBe(9);
    // Control: in Alberta road 1 counts as written.
    expect([card(roadApprenticeToOwnShopAB, "AB").linesToPrice, card(roadApprenticeToOwnShopAB, "AB").officialFees]).toEqual([30, 9]);
  });

  it("on the intake page step 3's headings use the lead size the intake already draws, never the title size (call 37)", () => {
    for (const state of [skipped(), { part: "road", job: BARBERS, area: null, region: null } as StepsState, { part: "road", job: CABINETMAKERS, area: null, region: null } as StepsState]) {
      const html = draw("intake", state);
      expect(html).not.toContain("text-title");
      expect(html).toContain("text-lead");
    }
    // Pick a future keeps its title size.
    expect(draw("futures", skipped())).toContain("text-title");
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

  it("step 3's lines about the list below are true to it: Alberta's as written; outside Alberta the federal steps first and Alberta's folded (AB, ON, YT)", () => {
    const at = (place: "CA-AB" | "CA-ON" | "CA-YT") => ({
      skipped: draw("futures", skipped(), place),
      // Outside Alberta every job has no road of its own (only the federal one is written for the place).
      noRoad: draw("futures", { part: "road", job: place === "CA-AB" ? BARBERS : CABINETMAKERS, area: null, region: null }, place),
    });
    // Outside Alberta the card right below is the federal steps and Alberta's futures are folded, grouped, not one
    // list in the order written: neither line may say otherwise.
    for (const place of ["CA-ON", "CA-YT"] as const) {
      const html = at(place);
      expect(html.noRoad, place).not.toContain("the general road below covers");
      expect(html.skipped, place).not.toContain("in the order they were written.");
      expect(html.noRoad, place).toContain(esc(pickWords.noRoad.body(CABINETMAKERS.label, true)));
      expect(html.skipped, place).toContain(esc(pickWords.skipped(true)));
      // The folded apprentice road says it's written for Cabinetmakers, so the no-road lines must not say no future
      // is: the heading names the person's own place, and the body says only the federal steps aren't written for it.
      expect(html.noRoad, place).toContain(esc(pickWords.writtenForJob("Cabinetmakers", "72311")));
      expect(html.noRoad, place).toContain(esc(pickWords.noRoad.heading(CABINETMAKERS.label, CABINETMAKERS.code, place === "CA-ON" ? "Ontario" : "Yukon")));
      expect(html.noRoad, place).not.toContain("None of them is written for");
      expect(html.noRoad, place).not.toContain(esc(pickWords.noRoad.heading(CABINETMAKERS.label, CABINETMAKERS.code)));
    }
    // In Alberta, unchanged.
    const ab = at("CA-AB");
    expect(ab.noRoad).toContain(
      esc(
        `If you plan to run a business of your own, the general road below covers the tax and structure steps for any business in Alberta. It isn't written for ${BARBERS.label}, and opening it doesn't say you're starting a business.`,
      ),
    );
    expect(ab.skipped).toContain(esc("You didn't pick a job, so no future is matched to one. These are all the futures written so far, in the order they were written."));
    expect(pickWords.noRoad.body(BARBERS.label, false)).toBe(
      `If you plan to run a business of your own, the general road below covers the tax and structure steps for any business in Alberta. It isn't written for ${BARBERS.label}, and opening it doesn't say you're starting a business.`,
    );
    // Outside Alberta's words name the federal steps for all of Canada and the fold.
    for (const line of [pickWords.noRoad.body(CABINETMAKERS.label, true), pickWords.skipped(true)]) {
      expect(line).toContain("federal steps");
      expect(line).toContain("written for all of Canada");
      expect(line).toContain("folded below");
    }
  });

  it("step 2's three lines about About this job are back, word for word as spec 02's as-built note records them (task 28h)", () => {
    // About this job reads the kept region (its region's own row; Alberta's for I don't know) and draws its Change,
    // so the three lines held by the PR #202 review are true and are drawn again.
    const parts = {
      "2a": draw("futures", { part: "area", job: CABINETMAKERS, area: null, region: null }),
      "2b": draw("futures", { part: "region", job: CABINETMAKERS, area: "cma-825", region: null }),
      "outside Alberta": draw("futures", { part: "outside", job: CABINETMAKERS, area: null, region: null }, "CA-ON"),
    };
    const kept = "Both answers are kept with this future once you open it, on this computer only. You can change your region later from About this job in the cockpit.";
    const dontKnow = "With “I don't know”, About this job shows the Alberta-wide figure, and a link to Statistics Canada's list of the towns in each region shows here.";
    const wageRow = "About this job shows the wage row Job Bank gives for Ontario as a whole, labelled with the level the government's own code gives it.";
    expect(whereStepWords.kept).toBe(kept);
    expect(whereStepWords.region.dontKnowNote).toBe(dontKnow);
    expect(whereStepWords.outside.wageRow("Ontario")).toBe(wageRow);
    expect(parts["2a"]).toContain(esc(kept));
    expect(parts["2b"]).toContain(esc(kept));
    expect(parts["2b"]).toContain(esc(dontKnow));
    expect(parts["outside Alberta"]).toContain(esc(wageRow));
    // Outside Alberta nothing is asked, so nothing is kept and the kept line isn't drawn there.
    expect(parts["outside Alberta"]).not.toContain(esc(kept));
  });

  it("2b: Statistics Canada's list is drawn only once “I don't know” is picked", () => {
    const at = (region: string | null) => draw("futures", { part: "region", job: CABINETMAKERS, area: "cma-825", region });
    expect(at(null)).not.toContain("statcan.gc.ca");
    expect(at("4830")).not.toContain("statcan.gc.ca");
    expect(at("dont-know")).toContain("statcan.gc.ca");
  });
});
