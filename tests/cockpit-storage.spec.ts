/**
 * Phase 1 storage for the future cockpit (docs/architecture/future-cockpit.md § 7, Storage as built):
 * skill marks for the person, progress per future and step, the future's road, endings and month, the
 * destination, the person's own income target, and the two new figure kinds. Run against a real data
 * file migrated by Prisma, through the storage code the cockpit's screens will call.
 *
 * Road 0 has no skill items or named cost lines yet, so most cases use the invented test road
 * (tests/helpers/invented-road.ts), passed in as the catalog the way the shipped one is by default.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { roadStartingAnyBusinessAB } from "@/lib/engines/roads/v2026";
import { agreeToFigures, listFigures, proposeFigures, VentureNotFoundError } from "@/lib/figures/store";
import { BUSINESS_TOTAL_KINDS, COST_LINE_AMOUNT_FROM, FIGURE_KIND_LABELS, FIGURE_KINDS } from "@/lib/figures/types";
import { chooseRoad, pickEnding, readFuture, setTargetMonth } from "@/lib/futures/future";
import { pickJob } from "@/lib/futures/job";
import {
  agreeToPersonFigures,
  currentIncomeWanted,
  discardPersonFigures,
  listPersonFigures,
  proposeIncomeWanted,
  retractPersonFigures,
} from "@/lib/futures/person-figures";
import { dayOnThisComputer } from "@/lib/futures/person";
import { listSkillMarks, markSkill } from "@/lib/futures/skill-marks";
import { listStepProgress, setStepProgress, STEP_CHANGES_KEPT } from "@/lib/futures/step-progress";
import { FutureInputError, SKILL_MARKS, STEP_STATUSES, type RoadsCatalog } from "@/lib/futures/types";
import { addDestination, addTypedStatement, latestDestination, listTypedStatements } from "@/lib/person/statements";
import { demoScenarios } from "../prisma/seed-data";
import { inventedRoad, inventedSkillItems } from "./helpers/invented-road";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

const dbFile = path.join(tmpdir(), `dotami-cockpit-storage-${randomUUID()}.db`);
let prisma: PrismaClient;
let ventureId: string;
let otherVentureId: string;

const TODAY = "2026-10-11";
const INVENTED = "road-invented-test-only";
const ROAD0 = roadStartingAnyBusinessAB.id;
/** The shipped road 0 beside the invented one, and the invented skill list. */
const catalog: RoadsCatalog = { roads: [roadStartingAnyBusinessAB, inventedRoad()], skillItems: inventedSkillItems };
const typed = { kind: "typed", label: "typed by you", rows: null };

beforeAll(async () => {
  migratedFile(dbFile);
  prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  ventureId = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
  otherVentureId = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

/** Road 0's picks as reading a future gives them: the map's toggles, marked as the map's, with no day. */
const fromMap = (branches: Record<string, string>) =>
  Object.fromEntries(
    roadStartingAnyBusinessAB.forks.filter((fork) => fork.sides.includes(branches[fork.id])).map((fork) => [fork.id, { stepId: branches[fork.id], pickedOn: null, from: "map" }]),
  );
/** A pick the person made on a road other than road 0, today. */
const picked = (stepId: string) => ({ stepId, pickedOn: dayOnThisComputer(new Date()), from: "you" });

describe("the saved future: its road, the endings picked on it, the person's month", () => {
  it("reads today's general road for an idea saved before roads, with its place as a code", async () => {
    const future = await readFuture(prisma, ventureId, catalog);
    expect(future).toEqual({
      ventureId,
      roadId: ROAD0,
      roadChosen: false,
      roadChosenOn: null,
      // demoScenarios[0] is an Alberta idea: stored as "CA-AB" in the file, read as the international code.
      place: "CA-AB",
      // Road 0's picks are the map's own toggles, read from where the map keeps them.
      forkPicks: fromMap(demoScenarios[0].state.activeBranches),
      targetMonth: null,
      targetMonthSetOn: null,
      // Asked only on Pick a future (2026-10-12): an idea saved any other way has no answer.
      lookingFor: null,
      lookingForOn: null,
      // No job picked for the government's skills list.
      job: null,
    });
    expect(Object.keys(future.forkPicks).sort()).toEqual(["gstTiming", "incorporationTiming"]);
  });

  it("stores the place in the data file as its international code, and the app still reads today's value", async () => {
    const [raw] = await prisma.$queryRawUnsafe<{ province: string }[]>(`SELECT province FROM "Venture" WHERE id = ?`, ventureId);
    expect(raw.province).toBe("CA-AB");
    expect((await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } })).province).toBe("AB");
    expect(await prisma.venture.count({ where: { id: ventureId, province: "AB" } })).toBe(1);
  });

  it("keeps a road from the catalog, refuses one that isn't there, and goes back to the general road", async () => {
    await expect(chooseRoad(prisma, ventureId, "road-nobody-wrote", catalog)).rejects.toThrow(FutureInputError);
    await expect(chooseRoad(prisma, ventureId, 42, catalog)).rejects.toThrow(FutureInputError);
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    expect((await readFuture(prisma, ventureId, catalog)).roadId).toBe(INVENTED);
    await chooseRoad(prisma, ventureId, null, catalog);
    expect(await readFuture(prisma, ventureId, catalog)).toMatchObject({ roadId: ROAD0, roadChosen: false });
    // The column holds nothing for "the general road", so a later default road can't be mistaken for a pick.
    expect((await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } })).roadId).toBeNull();
  });

  it("keeps the ending picked at a fork of the future's own road, by permanent ids", async () => {
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    await pickEnding(prisma, ventureId, { forkId: "fork-invented-ending", stepId: "step-invented-own" }, catalog);
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual({ "fork-invented-ending": picked("step-invented-own") });

    // Not a side of that fork, a fork that isn't on the road, a malformed request: refused, nothing changes.
    await expect(pickEnding(prisma, ventureId, { forkId: "fork-invented-ending", stepId: "step-invented-train" }, catalog)).rejects.toThrow(
      FutureInputError,
    );
    await expect(pickEnding(prisma, ventureId, { forkId: "fork-elsewhere", stepId: "step-invented-own" }, catalog)).rejects.toThrow(FutureInputError);
    await expect(pickEnding(prisma, ventureId, "own shop", catalog)).rejects.toThrow(FutureInputError);
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual({ "fork-invented-ending": picked("step-invented-own") });

    // A pick can be taken back.
    await pickEnding(prisma, ventureId, { forkId: "fork-invented-ending", stepId: null }, catalog);
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual({});
  });

  it("refuses road 0's two forks: they are picked on the map and kept with it, in one place", async () => {
    await chooseRoad(prisma, ventureId, null, catalog);
    const before = await prisma.scenarioState.findUniqueOrThrow({ where: { ventureId } });
    await expect(
      pickEnding(prisma, ventureId, { forkId: "gstTiming", stepId: "stage-2a-voluntary-gst-registration" }, catalog),
    ).rejects.toThrow(/on the map/);
    const after = await prisma.scenarioState.findUniqueOrThrow({ where: { ventureId } });
    expect(after.activeBranches).toEqual(before.activeBranches);
    expect((await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } })).forkPicks).toEqual({});
  });

  it("reads road 0's picks from the map, so a future has one set of picks whatever its road", async () => {
    await chooseRoad(prisma, ventureId, null, catalog);
    const branches = { gstTiming: "stage-2a-voluntary-gst-registration", incorporationTiming: "stage-3b-incorporation-liability-sred", notAFork: "x" };
    await prisma.scenarioState.update({ where: { ventureId }, data: { activeBranches: branches } });
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual({
      gstTiming: { stepId: "stage-2a-voluntary-gst-registration", pickedOn: null, from: "map" },
      incorporationTiming: { stepId: "stage-3b-incorporation-liability-sred", pickedOn: null, from: "map" },
    });
    // A value that isn't a side of its fork is left out, never guessed at.
    await prisma.scenarioState.update({ where: { ventureId }, data: { activeBranches: { gstTiming: "stage-1-sole-prop-activation" } } });
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual({});
    await ensureVentureFromScenario(prisma, demoScenarios[0]);
  });

  it("shows only the current road's picks, and keeps another road's for when the person goes back", async () => {
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    await pickEnding(prisma, ventureId, { forkId: "fork-invented-ending", stepId: "step-invented-employed" }, catalog);
    await chooseRoad(prisma, ventureId, null, catalog);
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual(fromMap(demoScenarios[0].state.activeBranches));
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual({ "fork-invented-ending": picked("step-invented-employed") });
  });

  it("saving the map again leaves another road's ending alone", async () => {
    // The map's save rewrites ScenarioState.activeBranches whole; the ending lives elsewhere for that reason.
    await ensureVentureFromScenario(prisma, demoScenarios[0]);
    expect((await readFuture(prisma, ventureId, catalog)).forkPicks).toEqual({ "fork-invented-ending": picked("step-invented-employed") });
  });

  it("keeps the person's own month and year, never one that has already gone", async () => {
    await setTargetMonth(prisma, ventureId, "2029-05", TODAY);
    expect((await readFuture(prisma, ventureId, catalog)).targetMonth).toBe("2029-05");
    // This month is allowed (it hasn't ended); last month, a non-month, a date: refused.
    await setTargetMonth(prisma, ventureId, "2026-10", TODAY);
    for (const bad of ["2026-09", "2029-13", "2029-5", "2029-05-01", 202905, ""]) {
      await expect(setTargetMonth(prisma, ventureId, bad, TODAY)).rejects.toThrow(FutureInputError);
    }
    expect((await readFuture(prisma, ventureId, catalog)).targetMonth).toBe("2026-10");
    await setTargetMonth(prisma, ventureId, null, TODAY);
    expect((await readFuture(prisma, ventureId, catalog)).targetMonth).toBeNull();
  });

  it("dates every answer kept on the future: the road chosen, each ending picked, the month", async () => {
    const today = dayOnThisComputer(new Date());
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    await pickEnding(prisma, ventureId, { forkId: "fork-invented-ending", stepId: "step-invented-own" }, catalog);
    await setTargetMonth(prisma, ventureId, "2029-05", TODAY);
    expect(await readFuture(prisma, ventureId, catalog)).toMatchObject({
      roadChosen: true,
      roadChosenOn: today,
      forkPicks: { "fork-invented-ending": { stepId: "step-invented-own", pickedOn: today, from: "you" } },
      targetMonth: "2029-05",
      targetMonthSetOn: today,
    });
    // In the file: a moment for the road and the month, and one inside each pick.
    const row = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } });
    expect(row.roadChosenAt).toBeInstanceOf(Date);
    expect(row.targetMonthSetAt).toBeInstanceOf(Date);
    const pick = (row.forkPicks as Record<string, { stepId: string; pickedAt: string }>)["fork-invented-ending"];
    expect(pick.stepId).toBe("step-invented-own");
    expect(Number.isNaN(Date.parse(pick.pickedAt))).toBe(false);

    // Going back to the general road, or clearing the month, leaves no date behind for an answer that isn't there.
    await chooseRoad(prisma, ventureId, null, catalog);
    await setTargetMonth(prisma, ventureId, null, TODAY);
    expect(await readFuture(prisma, ventureId, catalog)).toMatchObject({ roadChosenOn: null, targetMonthSetOn: null });
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    await pickEnding(prisma, ventureId, { forkId: "fork-invented-ending", stepId: null }, catalog);
  });

  it("answers an unknown idea with the same not-found as the figures", async () => {
    await expect(readFuture(prisma, "nope", catalog)).rejects.toThrow(VentureNotFoundError);
    await expect(chooseRoad(prisma, "nope", INVENTED, catalog)).rejects.toThrow(VentureNotFoundError);
    await expect(setTargetMonth(prisma, "nope", "2029-05", TODAY)).rejects.toThrow(VentureNotFoundError);
  });
});

describe("skill marks, kept once for the person", () => {
  it("are have, learning and not yet; I don't know removes the mark instead of storing a fourth", async () => {
    expect([...SKILL_MARKS]).toEqual(["have", "learning", "not-yet"]);
    await markSkill(prisma, { skillItemId: "skill-invented-ticket", mark: "learning" }, catalog);
    await markSkill(prisma, { skillItemId: "skill-invented-ticket", mark: "have" }, catalog);
    let marks = await listSkillMarks(prisma);
    // Marking again replaces the mark: still one row for the item.
    expect(marks.filter((m) => m.skillItemId === "skill-invented-ticket")).toEqual([
      expect.objectContaining({ skillItemId: "skill-invented-ticket", ownLabel: null, mark: "have" }),
    ]);
    await markSkill(prisma, { skillItemId: "skill-invented-ticket", mark: null }, catalog);
    marks = await listSkillMarks(prisma);
    expect(marks.find((m) => m.skillItemId === "skill-invented-ticket")).toBeUndefined();
  });

  it("refuses an id that isn't on the shared skill list, a mark that isn't one of the three, and both kinds at once", async () => {
    await expect(markSkill(prisma, { skillItemId: "skill-nobody-listed", mark: "have" }, catalog)).rejects.toThrow(FutureInputError);
    await expect(markSkill(prisma, { skillItemId: "skill-invented-ticket", mark: "dont-know" }, catalog)).rejects.toThrow(FutureInputError);
    await expect(markSkill(prisma, { skillItemId: "skill-invented-ticket", ownLabel: "Welding", mark: "have" }, catalog)).rejects.toThrow(
      FutureInputError,
    );
    await expect(markSkill(prisma, { mark: "have" }, catalog)).rejects.toThrow(FutureInputError);
    // The shipped list is empty until the first written future: nothing on it can be marked yet.
    await expect(markSkill(prisma, { skillItemId: "skill-invented-ticket", mark: "have" })).rejects.toThrow(FutureInputError);
    expect(await listSkillMarks(prisma)).toEqual([]);
  });

  it("keeps a skill the person added in their own words, trimmed, one mark per label", async () => {
    await markSkill(prisma, { ownLabel: "  Reading shop drawings ", mark: "not-yet" }, catalog);
    await markSkill(prisma, { ownLabel: "Reading shop drawings", mark: "learning" }, catalog);
    expect(await listSkillMarks(prisma)).toEqual([
      expect.objectContaining({ skillItemId: null, ownLabel: "Reading shop drawings", mark: "learning", markedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    ]);
    await expect(markSkill(prisma, { ownLabel: "   ", mark: "have" }, catalog)).rejects.toThrow(FutureInputError);
    await expect(markSkill(prisma, { ownLabel: "x".repeat(121), mark: "have" }, catalog)).rejects.toThrow(FutureInputError);
    await markSkill(prisma, { ownLabel: "Reading shop drawings", mark: null }, catalog);
    expect(await listSkillMarks(prisma)).toEqual([]);
  });

  it("treats a skill of the person's own as one skill whatever its capital letters, kept under the spelling typed last", async () => {
    await markSkill(prisma, { ownLabel: "Welding", mark: "have" }, catalog);
    await markSkill(prisma, { ownLabel: "welding", mark: "not-yet" }, catalog);
    expect((await listSkillMarks(prisma)).map((m) => [m.ownLabel, m.mark])).toEqual([["welding", "not-yet"]]);
    await markSkill(prisma, { ownLabel: "WELDING", mark: null }, catalog);
    expect(await listSkillMarks(prisma)).toEqual([]);
  });

  it("outlive every future: a mark belongs to the person, so deleting ideas leaves it", async () => {
    const scratch = (await ensureVentureFromScenario(prisma, { ...demoScenarios[1], id: "scratch-for-marks" })).ventureId;
    await markSkill(prisma, { skillItemId: "skill-invented-ticket", mark: "have" }, catalog);
    await prisma.venture.delete({ where: { id: scratch } });
    expect((await listSkillMarks(prisma)).map((m) => m.mark)).toEqual(["have"]);
    await markSkill(prisma, { skillItemId: "skill-invented-ticket", mark: null }, catalog);
  });
});

describe("the job closest to the work the person would do: their pick, for the government's skills list", () => {
  const pickedAt = async () =>
    (
      await prisma.$queryRawUnsafe<{ occupationCode: string | null; occupationPickedAt: unknown }[]>(
        `SELECT occupationCode, occupationPickedAt FROM "Venture" WHERE id = ?`,
        ventureId,
      )
    )[0]!;

  it("keeps a job code from the dataset with the day it was picked, and takes it back", async () => {
    await pickJob(prisma, ventureId, "72311.00");
    expect((await readFuture(prisma, ventureId, catalog)).job).toEqual({ code: "72311.00", label: "Cabinetmakers", pickedOn: dayOnThisComputer(new Date()) });
    expect((await pickedAt()).occupationCode).toBe("72311.00");
    await pickJob(prisma, ventureId, null);
    expect((await readFuture(prisma, ventureId, catalog)).job).toBeNull();
    expect(await pickedAt()).toEqual({ occupationCode: null, occupationPickedAt: null });
  });

  it("refuses anything that isn't one of the dataset's job codes, and keeps the pick that was there", async () => {
    await pickJob(prisma, ventureId, "72311.00");
    for (const code of ["99999.99", "72311", 72311, "", {}, undefined, "72311.00 "]) {
      await expect(pickJob(prisma, ventureId, code)).rejects.toThrow(FutureInputError);
    }
    expect((await readFuture(prisma, ventureId, catalog)).job?.code).toBe("72311.00");
  });

  it("picking the same job again keeps the moment it was first picked; another job is a new answer", async () => {
    const first = (await pickedAt()).occupationPickedAt;
    expect(first).not.toBeNull();
    await pickJob(prisma, ventureId, "72311.00");
    expect((await pickedAt()).occupationPickedAt).toEqual(first);
    await pickJob(prisma, ventureId, "72310.00");
    expect((await readFuture(prisma, ventureId, catalog)).job?.label).toBe("Carpenters");
    await pickJob(prisma, ventureId, null);
  });

  it("answers an unknown idea with the same not-found as the figures", async () => {
    await expect(pickJob(prisma, "nope", "72311.00")).rejects.toThrow(VentureNotFoundError);
  });

  it("a mark on an item of the government's list is the person's, whichever road the future is on, and outlives the pick", async () => {
    const numeracy = "skill-ca-oasis-f.01.c.01";
    await pickJob(prisma, ventureId, "72311.00");
    // The invented catalog and the shipped one both accept it: the list is its own catalog, not a road's.
    await markSkill(prisma, { skillItemId: numeracy, mark: "have" }, catalog);
    await markSkill(prisma, { skillItemId: numeracy, mark: "learning" });
    await pickJob(prisma, ventureId, null);
    expect((await listSkillMarks(prisma)).map((m) => [m.skillItemId, m.mark])).toEqual([[numeracy, "learning"]]);
    await expect(markSkill(prisma, { skillItemId: "skill-ca-oasis-x.99", mark: "have" })).rejects.toThrow(FutureInputError);
    await markSkill(prisma, { skillItemId: numeracy, mark: null });
    expect(await listSkillMarks(prisma)).toEqual([]);
  });
});

describe("step progress, per future and step", () => {
  it("keeps doing, done and not for me against the road's and the step's permanent ids", async () => {
    expect([...STEP_STATUSES]).toEqual(["doing", "done", "not-for-me"]);
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    await setStepProgress(prisma, ventureId, { roadId: INVENTED, stepId: "step-invented-train", status: "doing" }, catalog);
    await setStepProgress(prisma, ventureId, { roadId: INVENTED, stepId: "step-invented-train", doneWhenIds: ["dw-invented-1"] }, catalog);
    await setStepProgress(prisma, ventureId, { roadId: INVENTED, stepId: "step-invented-train", status: "done" }, catalog);
    const [row] = await listStepProgress(prisma, ventureId, catalog);
    expect(row).toMatchObject({ roadId: INVENTED, stepId: "step-invented-train", status: "done", doneWhenIds: ["dw-invented-1"] });
    // Each status change, in order, with its moment; a tick alone isn't a status change.
    expect(row.changes.map((c) => c.status)).toEqual(["doing", "done"]);
    for (const c of row.changes) expect(Number.isNaN(Date.parse(c.at))).toBe(false);
    // One row for the step, whatever was changed.
    expect(await prisma.stepProgress.count({ where: { ventureId } })).toBe(1);
  });

  it("refuses a step on another road, a step that isn't on the road, a line that isn't the step's, a status it doesn't know", async () => {
    const bad = [
      // Road 0 isn't this future's road now.
      { roadId: ROAD0, stepId: "stage-1-sole-prop-activation", status: "done" },
      { roadId: INVENTED, stepId: "step-nobody-wrote", status: "done" },
      { roadId: INVENTED, stepId: "step-invented-own", doneWhenIds: ["dw-invented-1"] },
      { roadId: INVENTED, stepId: "step-invented-train", status: "finished" },
      { roadId: INVENTED, stepId: "step-invented-train", doneWhenIds: "dw-invented-1" },
      { stepId: "step-invented-train", status: "done" },
    ];
    for (const input of bad) await expect(setStepProgress(prisma, ventureId, input, catalog)).rejects.toThrow(FutureInputError);
    expect(await prisma.stepProgress.count({ where: { ventureId } })).toBe(1);
  });

  it("keeps the person's status on road 0's steps here, and leaves the map's worked-out lists alone", async () => {
    // 2026-10-12, the cockpit screen: the map works out its active, done and set-aside lists from its
    // toggles on every load, so they were never the person's word; the person's own status for a road 0
    // step is kept here, like any other road's (docs/architecture/future-cockpit.md § 2, Cockpit screen
    // as built). The reviewer's case from before: a step the map has as done, then "not for me" sent here.
    const scratch = (await ensureVentureFromScenario(prisma, { ...demoScenarios[0], id: "scratch-road0-status" })).ventureId;
    const doneOnMap = demoScenarios[0].state.completedNodeIds[0];
    expect(roadStartingAnyBusinessAB.steps.some((s) => s.id === doneOnMap)).toBe(true);
    const mapBefore = await prisma.scenarioState.findUniqueOrThrow({ where: { ventureId: scratch } });
    for (const status of STEP_STATUSES) await setStepProgress(prisma, scratch, { roadId: ROAD0, stepId: doneOnMap, status }, catalog);
    const [row] = await listStepProgress(prisma, scratch, catalog);
    expect(row).toMatchObject({ roadId: ROAD0, stepId: doneOnMap, status: "not-for-me" });
    expect(row.changes.map((c) => c.status)).toEqual([...STEP_STATUSES]);
    // Taking it back keeps the history for "Since last time".
    await setStepProgress(prisma, scratch, { roadId: ROAD0, stepId: doneOnMap, status: null }, catalog);
    expect((await listStepProgress(prisma, scratch, catalog))[0]).toMatchObject({ status: null });
    // The map's own lists are not touched: they are still what its toggles work out.
    expect((await prisma.scenarioState.findUniqueOrThrow({ where: { ventureId: scratch } })).completedNodeIds).toEqual(mapBefore.completedNodeIds);
    // Road 0 has no done-when lines yet, so there is still no line to tick.
    await expect(setStepProgress(prisma, scratch, { roadId: ROAD0, stepId: doneOnMap, doneWhenIds: ["dw-invented-1"] }, catalog)).rejects.toThrow(
      FutureInputError,
    );
    // A step that isn't on road 0 is still refused.
    await expect(setStepProgress(prisma, scratch, { roadId: ROAD0, stepId: "step-invented-train", status: "done" }, catalog)).rejects.toThrow(
      FutureInputError,
    );
    await prisma.venture.delete({ where: { id: scratch } });
  });

  it("keeps nothing when the status is taken off a step that was never touched", async () => {
    await chooseRoad(prisma, otherVentureId, INVENTED, catalog);
    const view = await setStepProgress(prisma, otherVentureId, { roadId: INVENTED, stepId: "step-invented-own", status: null }, catalog);
    expect(view).toMatchObject({ roadId: INVENTED, stepId: "step-invented-own", status: null, doneWhenIds: [], changes: [] });
    expect(await prisma.stepProgress.count({ where: { ventureId: otherVentureId } })).toBe(0);
    expect(await listStepProgress(prisma, otherVentureId, catalog)).toEqual([]);
  });

  it("keeps a status taken back as none, and only the newest status changes", async () => {
    const step = { roadId: INVENTED, stepId: "step-invented-train" };
    await setStepProgress(prisma, otherVentureId, { ...step, status: "doing" }, catalog);
    await setStepProgress(prisma, otherVentureId, { ...step, status: null }, catalog);
    expect((await listStepProgress(prisma, otherVentureId, catalog))[0]).toMatchObject({ status: null });
    for (let i = 0; i < STEP_CHANGES_KEPT + 5; i++) {
      await setStepProgress(prisma, otherVentureId, { ...step, status: i % 2 ? "done" : "doing" }, catalog);
    }
    const [row] = await listStepProgress(prisma, otherVentureId, catalog);
    expect(row.changes).toHaveLength(STEP_CHANGES_KEPT);
    expect(row.changes.at(-1)!.status).toBe((STEP_CHANGES_KEPT + 4) % 2 ? "done" : "doing");
  });

  it("lists only the current road's progress, and brings another road's back when the person goes back", async () => {
    expect((await listStepProgress(prisma, otherVentureId, catalog)).map((p) => p.roadId)).toEqual([INVENTED]);
    await chooseRoad(prisma, otherVentureId, null, catalog);
    expect(await listStepProgress(prisma, otherVentureId, catalog)).toEqual([]);
    // Kept, not deleted.
    expect(await prisma.stepProgress.count({ where: { ventureId: otherVentureId } })).toBe(1);
    await chooseRoad(prisma, otherVentureId, INVENTED, catalog);
    expect((await listStepProgress(prisma, otherVentureId, catalog)).map((p) => p.stepId)).toEqual(["step-invented-train"]);
  });

  it("goes with its future: deleting the idea deletes its progress", async () => {
    const scratch = (await ensureVentureFromScenario(prisma, { ...demoScenarios[1], id: "scratch-for-progress" })).ventureId;
    await chooseRoad(prisma, scratch, INVENTED, catalog);
    await setStepProgress(prisma, scratch, { roadId: INVENTED, stepId: "step-invented-train", status: "done" }, catalog);
    expect(await prisma.stepProgress.count({ where: { ventureId: scratch } })).toBe(1);
    await prisma.venture.delete({ where: { id: scratch } });
    expect(await prisma.stepProgress.count({ where: { ventureId: scratch } })).toBe(0);
  });
});

describe("the destination, one of the person's statements", () => {
  it("is kept word for word and dated; a change is a new statement, and the newest is the destination", async () => {
    expect(await latestDestination(prisma)).toBeNull();
    await addTypedStatement(prisma, { text: "I like early mornings", saidAt: "2026-10-01" });
    await addDestination(prisma, { text: "My own small furniture shop, four-day weeks", saidAt: "2026-10-02" });
    await addDestination(prisma, { text: "My own shop, home for supper", saidAt: "2026-10-03" });
    expect(await latestDestination(prisma)).toMatchObject({ text: "My own shop, home for supper", saidAt: "2026-10-03", kind: "destination" });
    // Both versions stay among the statements, marked; the other statement isn't one.
    const all = await listTypedStatements(prisma);
    expect(all.filter((s) => s.kind === "destination").map((s) => s.text)).toEqual(["My own shop, home for supper", "My own small furniture shop, four-day weeks"]);
    expect(all.find((s) => s.text === "I like early mornings")!.kind).toBeUndefined();
  });
});

describe("the yearly income the person wants: theirs, through the agree step", () => {
  it("is proposed, never confirmed by proposing, and counts only once agreed", async () => {
    const [proposed] = await proposeIncomeWanted(prisma, { amountCents: 7_000_000 });
    expect(proposed).toMatchObject({ kind: "income-wanted", per: "year", amountCents: 7_000_000, currency: "CAD", status: "proposed", sourceKind: "typed" });
    expect(await currentIncomeWanted(prisma)).toBeNull();
    const { changed } = await agreeToPersonFigures(prisma, [proposed.id]);
    expect(changed).toEqual([expect.objectContaining({ id: proposed.id, status: "confirmed" })]);
    expect(await currentIncomeWanted(prisma)).toMatchObject({ amountCents: 7_000_000 });
  });

  it("agreeing to a new one takes back the old one, so there is one current target and the history stays", async () => {
    const [next] = await proposeIncomeWanted(prisma, { amountCents: 8_000_000 });
    await agreeToPersonFigures(prisma, [next.id], { [next.id]: { amountCents: 8_500_000 } });
    expect(await currentIncomeWanted(prisma)).toMatchObject({ id: next.id, amountCents: 8_500_000, editedByPerson: true });
    const all = await listPersonFigures(prisma);
    expect(all.map((f) => [f.amountCents, f.status])).toEqual([
      [7_000_000, "retracted"],
      [8_500_000, "confirmed"],
    ]);
  });

  it("can be turned down or taken back; neither deletes the row", async () => {
    const [unwanted] = await proposeIncomeWanted(prisma, { amountCents: 1 });
    await discardPersonFigures(prisma, [unwanted.id]);
    expect((await listPersonFigures(prisma)).find((f) => f.id === unwanted.id)).toBeUndefined();
    const current = (await currentIncomeWanted(prisma))!;
    await retractPersonFigures(prisma, [current.id]);
    expect(await currentIncomeWanted(prisma)).toBeNull();
    expect(await prisma.personFigure.count()).toBe(3);
  });

  it("refuses an amount that isn't a whole, non-negative number of cents, or a currency that isn't a code", async () => {
    for (const amountCents of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "7000"]) {
      await expect(proposeIncomeWanted(prisma, { amountCents })).rejects.toThrow(FutureInputError);
    }
    await expect(proposeIncomeWanted(prisma, { amountCents: 100, currency: "dollars" })).rejects.toThrow(FutureInputError);
  });

  it("never puts the amount in an error message (messages can reach a log)", async () => {
    const error = await proposeIncomeWanted(prisma, { amountCents: -4242 }).catch((e: Error) => e);
    expect(String((error as Error).message)).not.toContain("4242");
  });
});

describe("two new figure kinds: savings for starting and a start-up cost line", () => {
  it("are added after the five business totals, never renamed; the Ideas page form still offers only those five", () => {
    expect(FIGURE_KINDS.slice(0, 5)).toEqual([...BUSINESS_TOTAL_KINDS]);
    expect(FIGURE_KINDS.slice(5)).toEqual(["savings-for-start", "start-up-cost-line"]);
    for (const k of FIGURE_KINDS) expect(FIGURE_KIND_LABELS[k]).toBeTruthy();
    expect([...COST_LINE_AMOUNT_FROM]).toEqual(["quote", "link", "receipt", "your-guess"]);
    const panel = readFileSync(path.join(process.cwd(), "components/ventures/figures-panel.tsx"), "utf8");
    expect(panel).toContain("BUSINESS_TOTAL_KINDS.map(");
    expect(panel).not.toContain("FIGURE_KINDS.map(");
  });

  it("keeps savings as one day's amount, agreed like any figure", async () => {
    const [saved] = await proposeFigures(
      prisma,
      ventureId,
      typed,
      [{ kind: "savings-for-start", periodStart: TODAY, periodEnd: TODAY, amountCents: 1_200_000 }],
      TODAY,
      catalog,
    );
    expect(saved).toMatchObject({ kind: "savings-for-start", status: "proposed", costLine: null });
    await agreeToFigures(prisma, ventureId, [saved.id]);
    expect((await listFigures(prisma, ventureId)).find((f) => f.id === saved.id)!.status).toBe("confirmed");
  });

  it("keeps a quote against a named line on the future's own road, with where the amount came from", async () => {
    await chooseRoad(prisma, ventureId, INVENTED, catalog);
    const [quote] = await proposeFigures(
      prisma,
      ventureId,
      typed,
      [
        {
          kind: "start-up-cost-line",
          periodStart: TODAY,
          periodEnd: TODAY,
          amountCents: 340_000,
          costLine: { roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools", amountFrom: "quote" },
        },
      ],
      TODAY,
      catalog,
    );
    expect(quote.costLine).toEqual({ roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools", amountFrom: "quote" });
  });

  it("refuses a cost line that isn't a named line on this future's road, or one without where its amount came from", async () => {
    const line = (costLine: unknown, extra: Record<string, unknown> = {}) => [
      { kind: "start-up-cost-line", periodStart: TODAY, periodEnd: TODAY, amountCents: 100, costLine, ...extra },
    ];
    const refused = [
      // An official fee is never quoted.
      line({ roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-fee", amountFrom: "quote" }),
      line({ roadId: INVENTED, stepId: "step-invented-own", lineId: "cost-invented-tools", amountFrom: "quote" }),
      line({ roadId: ROAD0, stepId: "stage-1-sole-prop-activation", lineId: "cost-invented-tools", amountFrom: "quote" }),
      line({ roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools", amountFrom: "a friend said" }),
      line({ roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools" }),
      line(undefined),
      // Never negative, and one day, not a period.
      line({ roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools", amountFrom: "quote" }, { amountCents: -100 }),
      line({ roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools", amountFrom: "quote" }, { periodStart: "2026-10-01" }),
    ];
    for (const inputs of refused) await expect(proposeFigures(prisma, ventureId, typed, inputs, TODAY, catalog)).rejects.toThrow(/Figure 1:/);
    // Savings: never negative, one day; and no other kind may name a cost line.
    await expect(
      proposeFigures(prisma, ventureId, typed, [{ kind: "savings-for-start", periodStart: TODAY, periodEnd: TODAY, amountCents: -1 }], TODAY, catalog),
    ).rejects.toThrow(/Figure 1:/);
    await expect(
      proposeFigures(
        prisma,
        ventureId,
        typed,
        [
          {
            kind: "gross-revenue",
            periodStart: "2026-09-01",
            periodEnd: "2026-09-30",
            amountCents: 100,
            costLine: { roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools", amountFrom: "quote" },
          },
        ],
        TODAY,
        catalog,
      ),
    ).rejects.toThrow(/Figure 1:/);
  });

  it("dates savings and a cost line to the day they were given: another day is refused", async () => {
    const line = { roadId: INVENTED, stepId: "step-invented-train", lineId: "cost-invented-tools", amountFrom: "quote" };
    for (const day of ["2019-03-01", "2026-10-10"]) {
      await expect(
        proposeFigures(prisma, ventureId, typed, [{ kind: "savings-for-start", periodStart: day, periodEnd: day, amountCents: 100 }], TODAY, catalog),
      ).rejects.toThrow(/Figure 1:/);
      await expect(
        proposeFigures(prisma, ventureId, typed, [{ kind: "start-up-cost-line", periodStart: day, periodEnd: day, amountCents: 100, costLine: line }], TODAY, catalog),
      ).rejects.toThrow(/Figure 1:/);
    }
  });

  it("keeps one current number per cost line and per idea's savings: agreeing a new one takes back the old", async () => {
    await chooseRoad(prisma, otherVentureId, INVENTED, catalog);
    const line = (lineId: string, amountFrom: string, amountCents: number) => ({
      kind: "start-up-cost-line",
      periodStart: TODAY,
      periodEnd: TODAY,
      amountCents,
      costLine: { roadId: INVENTED, stepId: "step-invented-train", lineId, amountFrom },
    });
    const confirmed = async () =>
      (await listFigures(prisma, otherVentureId))
        .filter((f) => f.status === "confirmed" && (f.kind === "start-up-cost-line" || f.kind === "savings-for-start"))
        .map((f) => [f.kind, f.amountCents, f.costLine?.amountFrom ?? null]);

    const [quote] = await proposeFigures(prisma, otherVentureId, typed, [line("cost-invented-tools", "quote", 340_000)], TODAY, catalog);
    await agreeToFigures(prisma, otherVentureId, [quote.id]);
    const [receipt] = await proposeFigures(prisma, otherVentureId, typed, [line("cost-invented-tools", "receipt", 410_000)], TODAY, catalog);
    // Proposing alone changes nothing: the agreed quote is still the current number.
    expect(await confirmed()).toEqual([["start-up-cost-line", 340_000, "quote"]]);
    await agreeToFigures(prisma, otherVentureId, [receipt.id]);
    expect(await confirmed()).toEqual([["start-up-cost-line", 410_000, "receipt"]]);
    // The quote stays in the history, taken back with the day.
    const old = (await listFigures(prisma, otherVentureId)).find((f) => f.id === quote.id)!;
    expect(old.status).toBe("retracted");
    expect(old.retractedAt).not.toBeNull();

    // Two numbers for one line agreed at once: the one proposed last stays.
    const [a] = await proposeFigures(prisma, otherVentureId, typed, [line("cost-invented-tools", "your-guess", 1_000)], TODAY, catalog);
    const [b] = await proposeFigures(prisma, otherVentureId, typed, [line("cost-invented-tools", "link", 2_000)], TODAY, catalog);
    await agreeToFigures(prisma, otherVentureId, [b.id, a.id]);
    expect(await confirmed()).toEqual([["start-up-cost-line", 2_000, "link"]]);

    // Savings: one per idea; another idea's savings are its own.
    const savings = (amountCents: number) => [{ kind: "savings-for-start", periodStart: TODAY, periodEnd: TODAY, amountCents }];
    const [s1] = await proposeFigures(prisma, otherVentureId, typed, savings(500_000), TODAY, catalog);
    await agreeToFigures(prisma, otherVentureId, [s1.id]);
    const [s2] = await proposeFigures(prisma, otherVentureId, typed, savings(650_000), TODAY, catalog);
    await agreeToFigures(prisma, otherVentureId, [s2.id]);
    expect(await confirmed()).toEqual([
      ["start-up-cost-line", 2_000, "link"],
      ["savings-for-start", 650_000, null],
    ]);
    expect((await listFigures(prisma, ventureId)).filter((f) => f.kind === "savings-for-start" && f.status === "confirmed")).toHaveLength(1);
  });

  it("leaves every existing kind exactly as it was: a business total still has no cost line", async () => {
    const [revenue] = await proposeFigures(
      prisma,
      otherVentureId,
      typed,
      [{ kind: "gross-revenue", periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: -5_000 }],
      TODAY,
    );
    expect(revenue).toMatchObject({ kind: "gross-revenue", amountCents: -5_000, costLine: null });
  });
});
