/**
 * Places and programs (the maintainer's calls of 2026-10-23 on https://claude.ai/artifact/BVdUwZuHGHTgD12H9dHaey):
 *
 * - S2.5.33's bug 33a: Change on the place row of "What you've told DotAmi" edits this idea (a one-question box
 *   saved with the idea, the way the structure's is), where until now it opened the intake, which saves a second
 *   idea and leaves the first one in the wrong province; and once the place isn't Alberta, no Alberta area or
 *   region is shown (Your plan, About this job), though the columns stay kept for a later history (a-call-9).
 * - a-call-12: every road draws a step's sources for the person's own place (federal pages and their own
 *   province's), with the line counting the rest; Hire first employee cites Alberta's own employment-standards
 *   page, checked by a tool and waiting for a person's read.
 * - a-call-1: the Alberta Investor Tax Credit and the Canada-Alberta Job Grant are off the programs catalog and
 *   every road, each kept in the retired list with the official reason and the day it was read.
 *
 * The end-to-end side (the idea count stays 1 in a real browser) is e2e/place-change.spec.ts.
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { aboutJobForFuture } from "@/lib/about-job/view";
import { buildPlan } from "@/lib/cockpit/plan";
import { toldRows } from "@/lib/cockpit/told";
import { cockpitInput } from "@/lib/cockpit/view";
import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseFirstSave } from "@/lib/db/parse-scenario-input";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { grantsCatalogV2026 } from "@/lib/engines/grants/v2026";
import { RETIRED_GRANT_PROGRAMS } from "@/lib/engines/grants/v2026/programs";
import { citationsForPlace, generalRoadV2026, roadsV2026 } from "@/lib/engines/roads/v2026";
import { readFuture } from "@/lib/futures/future";
import { readPlan } from "@/lib/futures/read-plan";
import { SHIPPED_ROADS_CATALOG } from "@/lib/futures/types";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { evaluateRoad } from "@/lib/roads";
import { PROVINCES } from "@/lib/scenarios/types";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";
import { inventedIdea, TODAY } from "./helpers/road-to-evaluate";

const BARBERS = "63210.02";
const NOW = new Date("2026-10-23T12:00:00Z");

describe("33a: the place row's Change edits this idea", () => {
  it("opens the one-question box on the cockpit, never the intake (which saves a second idea)", () => {
    const scenario = inventedIdea({ province: "AB" });
    const input = cockpitInput({
      road: generalRoadV2026,
      roadChosen: true,
      skillItems: [],
      scenario,
      figures: [],
      personFigures: [],
      future: null,
      progress: [],
      skillMarks: [],
      today: TODAY,
    });
    const evaluation = evaluateRoad(input);
    const kept = { progress: [], skillMarks: [], forkPickedOn: {}, targetMonthSetOn: null, figures: [], incomeWantedOn: null };
    const place = toldRows(input, evaluation, kept).find((row) => row.id === "idea:place");
    expect(place, "the told list has a place row").toBeDefined();
    expect(place!.change).toEqual({ kind: "box", question: "place" });
  });
});

describe("33a: no Alberta area or region shown once the idea's place isn't Alberta", () => {
  const dbFile = path.join(tmpdir(), `dotami-place-change-${randomUUID()}.db`);
  let prisma: PrismaClient;
  beforeAll(() => {
    migratedFile(dbFile);
    prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  }, 120_000);
  afterAll(async () => {
    await prisma?.$disconnect();
    for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
  });

  /** An Alberta idea picked with Calgary and region 4830, then saved again (the cockpit's save) in `province`. */
  async function movedIdea(province: "AB" | "ON" | "SK") {
    const scenario = { ...demoScenarios[0], id: `scenario-${randomUUID()}`, profile: { ...demoScenarios[0].profile, province: "AB" as const } };
    const firstSave = parseFirstSave({ job: BARBERS, area: "cma-825", region: "4830", roadId: generalRoadV2026.id }, NOW, "AB");
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario, { ...firstSave, roadId: generalRoadV2026.id });
    // The cockpit's save of the same idea with its new place: the update branch, same scenario id.
    await ensureVentureFromScenario(prisma, { ...scenario, profile: { ...scenario.profile, province } });
    return ventureId;
  }

  /** Every line of the plan that names the area or the region the person picked in Alberta. */
  const albertaLines = (lines: readonly string[]) => lines.filter((line) => /Calgary|Your area|economic region/i.test(line));

  it("in Alberta, the area and region are shown (the check below can see them)", async () => {
    const id = await movedIdea("AB");
    const future = await readFuture(prisma, id, SHIPPED_ROADS_CATALOG);
    expect(future.area?.value).toBe("cma-825");
    expect(future.region?.value).toBe("4830");
    const plan = buildPlan((await readPlan(prisma, id, "2026-10-23"))!);
    expect(albertaLines(plan.road.where)).toHaveLength(2);
  });

  it("after a move out of Alberta: one idea, its new place, and no Alberta area or region in the plan or About this job", async () => {
    const before = await prisma.venture.count();
    const id = await movedIdea("ON");
    expect(await prisma.venture.count()).toBe(before + 1);
    const future = await readFuture(prisma, id, SHIPPED_ROADS_CATALOG);
    expect(future.place).toBe("CA-ON");
    expect(future.area).toBeNull();
    expect(future.region).toBeNull();
    const plan = buildPlan((await readPlan(prisma, id, "2026-10-23"))!);
    expect(albertaLines(plan.road.where)).toEqual([]);
    const about = aboutJobForFuture(future)!;
    expect(about.area).toBeNull();
    expect(about.wages.context.kind).toBe("outside-alberta");
    // Kept, not deleted: a later history of places (a-call-9) reads them.
    const row = await prisma.venture.findUniqueOrThrow({ where: { id }, select: { landscapeArea: true, economicRegion: true, province: true } });
    expect(row).toEqual({ landscapeArea: "cma-825", economicRegion: "4830", province: "ON" });
  });

  it("control: the plan's lines name the Alberta area when handed it, so the check above can fail", async () => {
    const id = await movedIdea("SK");
    const args = (await readPlan(prisma, id, "2026-10-23"))!;
    const planted = buildPlan({ ...args, where: { area: { value: "cma-825", setOn: "2026-10-23" }, region: null } });
    expect(albertaLines(planted.road.where)).toEqual(["Your area: Calgary · picked 2026-10-23"]);
  });
});

describe("a-call-12: every road draws a step's sources for the person's own place", () => {
  const hire = generalRoadV2026.steps.find((s) => s.id === "branch-hire-first-employee")!;
  const places = (cs: readonly { jurisdiction: string }[]) => cs.map((c) => c.jurisdiction);

  it("Hire first employee on road 0 in Alberta: the CRA's pages and Alberta's, the other provinces' counted", () => {
    const ab = citationsForPlace(generalRoadV2026, hire.citations, "AB");
    expect(places(ab.shown)).toEqual(["CA", "CA", "AB"]);
    expect(ab.leftOut).toBe(2);
  });

  it("no road shows a page written for another province, in any province or territory", () => {
    for (const road of roadsV2026) {
      for (const step of road.steps) {
        for (const province of PROVINCES) {
          const { shown, leftOut } = citationsForPlace(road, step.citations, province);
          const other = shown.filter((c) => c.jurisdiction !== "CA" && c.jurisdiction !== province);
          expect(other.map((c) => `${road.id} · ${step.id} · ${province} · ${c.url}`)).toEqual([]);
          expect(shown.length + leftOut).toBe(step.citations.length);
        }
      }
    }
  });

  it("Alberta's employment-standards page: checked by a tool, its words recorded, no read date (waiting for a person)", () => {
    const node = cfeCatalogV2026.nodes.find((n) => n.id === "branch-hire-first-employee")!;
    const alberta = (node.citations as readonly EngineCitation[]).filter((c) => c.jurisdiction === "AB");
    expect(alberta).toHaveLength(1);
    expect(alberta[0].url).toBe("https://www.alberta.ca/employment-standards");
    expect(alberta[0].lastVerified).toBeUndefined();
    expect(alberta[0].toolCheck?.checkedOn).toBe("2026-10-23");
    expect(alberta[0].toolCheck?.quotes).toContain("Employment standards set out the rights and obligations of employers and employees in Alberta.");
  });
});

describe("a-call-1: two ended programs are off", () => {
  const RETIRED = ["grant-abti", "grant-cajg"];

  it("neither is in the programs catalog", () => {
    const ids = grantsCatalogV2026.entries.map((p) => p.id as string);
    for (const id of RETIRED) expect(ids).not.toContain(id);
  });

  it("no road's step points at either", () => {
    for (const road of roadsV2026) {
      const hinted = road.steps.flatMap((step) => step.engineHints ?? []);
      // The check can see a hint: road 0's GST stage names the small-supplier rule.
      if (road.id === generalRoadV2026.id) expect(hinted).toContain("compliance-gst-small-supplier");
      for (const id of RETIRED) expect(hinted, road.id).not.toContain(id);
    }
  });

  it("each is in the retired list with the official reason and the day it was read", () => {
    expect(RETIRED_GRANT_PROGRAMS.map((p) => p.id).sort()).toEqual(RETIRED);
    for (const p of RETIRED_GRANT_PROGRAMS) {
      expect(p.readOn).toBe("2026-10-23");
      expect(p.why.length).toBeGreaterThan(20);
      expect(p.url).toMatch(/^https:\/\/www\.alberta\.ca\//);
    }
  });
});
