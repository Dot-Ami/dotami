/**
 * The jobs a road is written for (task 25e; docs/architecture/research-kit.md § 5.3): each road names them in
 * `codes.occupations`, the road checks refuse a code the government's list doesn't have, and the road match
 * Pick a future will call (docs/ui-spec/futures/03-road-match.md) answers from the person's own pick only, with
 * "no road" a real answer rather than a fall back to road 0.
 */
import { describe, expect, it } from "vitest";

import { oasisJobs } from "@/lib/engines/oasis/v2026";
import {
  roadApprenticeToOwnShopAB,
  roadCodeProblems,
  roadProblems,
  roadsV2026,
  roadsWrittenForJob,
  roadStartingAnyBusinessAB,
  skillItemsV2026,
  type Road,
} from "@/lib/engines/roads/v2026";

import { inventedRoad, inventedSkillItems } from "./helpers/invented-road";

/** An invented road written for the given jobs (or none), for the planted cases. */
const writtenFor = (occupations: Road["codes"]["occupations"], id = "road-invented-test-only"): Road => ({
  ...inventedRoad(),
  id,
  codes: { occupations },
});

describe("the jobs each written road names", () => {
  it("road 1 (From apprentice to your own shop) is written for 72311 Cabinetmakers", () => {
    expect(roadApprenticeToOwnShopAB.codes).toEqual({ occupations: ["72311"] });
  });

  it("road 0 (Starting any business in Alberta) says it is written for no particular job", () => {
    expect(roadStartingAnyBusinessAB.codes).toEqual({ occupations: "no-particular-job" });
  });

  it("every road's codes pass the checks, alone and as part of the road's own checks", () => {
    for (const road of roadsV2026) {
      expect(roadCodeProblems(road), road.id).toEqual([]);
      expect(roadProblems(road, skillItemsV2026), road.id).toEqual([]);
    }
  });
});

describe("the road checks refuse a job code the government's list doesn't have", () => {
  it("an unknown 5-digit code", () => {
    expect(roadCodeProblems(writtenFor(["99999"]))).toEqual([
      'Road "road-invented-test-only" names a job the government\'s list doesn\'t have: "99999".',
    ]);
    // And through the road's own checks, so no road ships with one.
    expect(roadProblems(writtenFor(["99999"]), inventedSkillItems)).toContain(
      'Road "road-invented-test-only" names a job the government\'s list doesn\'t have: "99999".',
    );
  });

  it("a code that isn't five digits: an OaSIS profile code, a short code, a name", () => {
    expect(roadCodeProblems(writtenFor(["72311.00", "7231", "Cabinetmakers"]))).toEqual([
      'Road "road-invented-test-only" names a job code that isn\'t five digits: "72311.00".',
      'Road "road-invented-test-only" names a job code that isn\'t five digits: "7231".',
      'Road "road-invented-test-only" names a job code that isn\'t five digits: "Cabinetmakers".',
    ]);
  });

  it("the same job twice", () => {
    expect(roadCodeProblems(writtenFor(["72311", "72311"]))).toEqual(['Road "road-invented-test-only" names the job "72311" twice.']);
  });

  it("an empty list, which must say \"no-particular-job\" instead", () => {
    expect(roadCodeProblems(writtenFor([]))).toEqual([
      'Road "road-invented-test-only" names an empty list of jobs: say "no-particular-job" if it is written for none.',
    ]);
  });

  it("a road with no codes at all, or codes in neither shape (a contributor's file arrives as data)", () => {
    const { codes: _codes, ...noCodes } = inventedRoad();
    expect(roadCodeProblems(noCodes as Road)).toEqual([
      'Road "road-invented-test-only" names no codes: say which jobs it is written for, or "no-particular-job".',
    ]);
    expect(roadCodeProblems(writtenFor("any-job" as Road["codes"]["occupations"]))).toEqual([
      'Road "road-invented-test-only" names its jobs as neither a list of codes nor "no-particular-job".',
    ]);
  });

  it("a job group that is on the list passes, including one whose group holds several jobs", () => {
    // 63210 holds Hairstylists (63210.01) and Barbers (63210.02) on the government's list.
    expect(roadCodeProblems(writtenFor(["72311", "63210"]))).toEqual([]);
  });
});

describe("the roads written for the person's pick of job (the road match)", () => {
  it("finds road 1 for Cabinetmakers, from the pick as kept on the idea or from its group", () => {
    expect(roadsWrittenForJob("72311.00").map((r) => r.id)).toEqual(["road-apprentice-to-own-shop-ab"]);
    expect(roadsWrittenForJob("72311").map((r) => r.id)).toEqual(["road-apprentice-to-own-shop-ab"]);
  });

  it("finds no road for a job no road is written for, and doesn't fall back to road 0", () => {
    expect(roadsWrittenForJob("63210.02")).toEqual([]);
  });

  it("never offers road 0, or any road written for no particular job, for any job on the government's list", () => {
    let matched = 0;
    for (const job of oasisJobs) {
      const roads = roadsWrittenForJob(job.code);
      expect(roads.some((r) => r.codes.occupations === "no-particular-job"), job.code).toBe(false);
      matched += roads.length;
    }
    // Today only Cabinetmakers (one OaSIS job) has a road written for it.
    expect(matched).toBe(1);
  });

  it("matches nothing for anything that isn't a job code", () => {
    for (const notAJob of ["", "7231", "72311.0", "Cabinetmakers", " 72311", "72311.00.00"]) {
      expect(roadsWrittenForJob(notAJob), notAJob).toEqual([]);
    }
  });

  it("lists the roads written for one job in the order they were written, never ranked", () => {
    const first = writtenFor(["72311"], "road-invented-first");
    const second = writtenFor(["63210", "72311"], "road-invented-second");
    const general = writtenFor("no-particular-job", "road-invented-general");
    expect(roadsWrittenForJob("72311.00", [first, general, second]).map((r) => r.id)).toEqual(["road-invented-first", "road-invented-second"]);
    expect(roadsWrittenForJob("72311.00", [second, general, first]).map((r) => r.id)).toEqual(["road-invented-second", "road-invented-first"]);
    expect(roadsWrittenForJob("63210.01", [first, general, second]).map((r) => r.id)).toEqual(["road-invented-second"]);
  });
});
