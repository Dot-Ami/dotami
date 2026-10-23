/**
 * The goal bar's line after Look inside (docs/ui-spec/futures/03-road-match.md, "After Look inside: what the
 * cockpit says"; task 28c): why the road drawn is the one drawn, in every case, so no idea is drawn on a road
 * with nothing on screen saying why. One function (lib/cockpit/road-line.ts `goalRoadLine`) for the goal bar and
 * the plan, so the two can't say different things.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoalBar } from "@/components/cockpit/goal-bar";
import { cockpitInput } from "@/lib/cockpit/view";
import { goalRoadLine } from "@/lib/cockpit/road-line";
import { cockpitWords } from "@/lib/cockpit/words";
import { generalRoadV2026, roadApprenticeToOwnShopAB, roadFederalStepsCA, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import { evaluateRoad } from "@/lib/roads";
import { inventedIdea, TODAY } from "./helpers/road-to-evaluate";
import { findTimeWords } from "./helpers/time-words";
import { findVerdicts } from "./helpers/verdict-words";

const CABINETMAKERS = { code: "72311.00", label: "Cabinetmakers" };
const BARBERS = { code: "63210.02", label: "Barbers" };
const ROAD_1 = roadApprenticeToOwnShopAB.label;
const ROAD_0 = generalRoadV2026.label;

describe("the goal bar says why this road, in every case of spec 03's table", () => {
  it("opened on the road written for the picked job", () => {
    expect(goalRoadLine(roadApprenticeToOwnShopAB, "AB", { roadChosen: true, job: CABINETMAKERS })).toBe(
      `Future: ${ROAD_1} · written for your pick of job`,
    );
  });

  it("opened on road 0 with a job no road is written for", () => {
    expect(goalRoadLine(generalRoadV2026, "AB", { roadChosen: true, job: BARBERS })).toBe(`Future: ${ROAD_0} · not written for your pick of job, Barbers`);
  });

  it("opened on a road written for another job than the one picked says so too", () => {
    expect(goalRoadLine(roadApprenticeToOwnShopAB, "AB", { roadChosen: true, job: BARBERS })).toBe(
      `Future: ${ROAD_1} · not written for your pick of job, Barbers`,
    );
    expect(goalRoadLine(generalRoadV2026, "AB", { roadChosen: true, job: CABINETMAKERS })).toBe(
      `Future: ${ROAD_0} · not written for your pick of job, Cabinetmakers`,
    );
  });

  it("opened with no job picked: the road's name, as before", () => {
    expect(goalRoadLine(generalRoadV2026, "AB", { roadChosen: true, job: null })).toBe(`Future: ${ROAD_0}`);
    expect(goalRoadLine(roadApprenticeToOwnShopAB, "AB", { roadChosen: true, job: null })).toBe(`Future: ${ROAD_1}`);
  });

  it("an idea saved before a road was picked for it (no road kept) says it is drawn on the general road, and why", () => {
    expect(goalRoadLine(generalRoadV2026, "AB", { roadChosen: false, job: null })).toBe(
      `Map drawn: ${ROAD_0} · the general road, because this idea was saved before a road was picked for it`,
    );
    // A job picked later in the skills list doesn't make it a pick of road.
    expect(goalRoadLine(generalRoadV2026, "AB", { roadChosen: false, job: BARBERS })).toBe(
      `Map drawn: ${ROAD_0} · the general road, because this idea was saved before a road was picked for it`,
    );
  });

  it("outside Alberta the place's own lines stay as spec 04 has them", () => {
    expect(goalRoadLine(roadFederalStepsCA, "ON", { roadChosen: true, job: CABINETMAKERS })).toBe(
      "Future: The federal steps for any business in Canada · Ontario's own steps aren't written yet",
    );
    // An Alberta road opened from outside Alberta (the maintainer's call 35 of 2026-10-22: honest while it says so).
    expect(goalRoadLine(generalRoadV2026, "ON", { roadChosen: true, job: BARBERS })).toBe(
      `Map drawn: ${ROAD_0} · written for AB; this idea is in ON`,
    );
    // Saved before roads, outside Alberta: the place's mismatch is what the line says.
    expect(goalRoadLine(generalRoadV2026, "ON", { roadChosen: false, job: null })).toBe(`Map drawn: ${ROAD_0} · written for AB; this idea is in ON`);
  });

  it("left without the pick, the line is the road's name (the example and older callers)", () => {
    expect(goalRoadLine(roadApprenticeToOwnShopAB, "AB")).toBe(`Future: ${ROAD_1}`);
  });

  it("its words carry no verdict and no time", () => {
    const lines = [
      cockpitWords.goal.forJob,
      cockpitWords.goal.notForJob("Barbers"),
      cockpitWords.goal.savedBeforeRoads(ROAD_0),
    ];
    for (const line of lines) {
      expect(findVerdicts(line), line).toEqual([]);
      expect(findTimeWords(line), line).toEqual([]);
    }
  });

  it("the goal bar draws the line it is given the pick for", () => {
    const scenario = inventedIdea({ province: "AB" });
    const input = cockpitInput({
      road: generalRoadV2026,
      roadChosen: false,
      skillItems: skillItemsV2026,
      scenario,
      figures: [],
      personFigures: [],
      future: { forkPicks: {}, targetMonth: null },
      progress: [],
      skillMarks: [],
      job: null,
      today: TODAY,
    });
    const html = renderToStaticMarkup(
      createElement(GoalBar, {
        road: generalRoadV2026,
        evaluation: evaluateRoad(input),
        scenario,
        firstWords: null,
        target: null,
        active: null,
        onGauge: () => {},
        roadWhy: { roadChosen: false, job: null },
      }),
    );
    expect(html).toContain("the general road, because this idea was saved before a road was picked for it");
  });
});
