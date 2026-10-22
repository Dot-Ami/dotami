/**
 * The job-links catalog (lib/engines/research-kit/v2026/job-links.ts; task 25e): an entry only for a job a road
 * is written for, holding only what a person reviewed, and for every other job a line that says there is none.
 */
import { describe, expect, it } from "vitest";

import { isOasisJobGroup, oasisJobs } from "@/lib/engines/oasis/v2026";
import { JOB_LINKS, jobLinksFor, jobLinksWords } from "@/lib/engines/research-kit/v2026/job-links";
import { SOURCES } from "@/lib/engines/research-kit/v2026/registry";
import { roadsV2026 } from "@/lib/engines/roads/v2026";

import { findTimeWords } from "./helpers/time-words";
import { findVerdicts } from "./helpers/verdict-words";

/** Every job some road is written for, as 5-digit groups. */
const roadJobs = [...new Set(roadsV2026.flatMap((r) => (r.codes.occupations === "no-particular-job" ? [] : r.codes.occupations)))].sort();

describe("the job-links catalog", () => {
  it("has an entry for exactly the jobs a road is written for: today, 72311 Cabinetmakers", () => {
    expect(roadJobs).toEqual(["72311"]);
    expect(JOB_LINKS.map((e) => e.noc)).toEqual(roadJobs);
  });

  it("keys each entry by a 5-digit job group on the government's list, once, in code order, under that job's name", () => {
    const nocs = JOB_LINKS.map((e) => e.noc);
    expect(nocs).toEqual([...new Set(nocs)].sort());
    for (const entry of JOB_LINKS) {
      expect(isOasisJobGroup(entry.noc), entry.noc).toBe(true);
      const names = oasisJobs.filter((j) => j.code.startsWith(`${entry.noc}.`)).map((j) => j.label);
      expect(names, entry.noc).toContain(entry.label);
    }
  });

  it("holds no industry code while the industry list isn't imported, and no place category while no place list is", () => {
    // The NAICS list comes with the industry question in phase 3 (the maintainer's call of 2026-10-20); a code
    // can't be checked against a list DotAmi doesn't have, so none may be written here before it is imported.
    expect(SOURCES.find((c) => c.id === "naics-2022")!.phase).toBe("phase-3");
    expect(JOB_LINKS.flatMap((e) => e.industryCandidates)).toEqual([]);
    // No place list has a card in the registry yet (they wait on S2.5.26).
    expect(JOB_LINKS.flatMap((e) => e.placeCategories)).toEqual([]);
  });
});

describe("the links for a job", () => {
  it("gives Cabinetmakers' entry, from the pick as kept on the idea or from its group", () => {
    const cabinetmakers = JOB_LINKS.find((e) => e.noc === "72311")!;
    expect(jobLinksFor("72311.00")).toEqual({ kind: "listed", links: cabinetmakers });
    expect(jobLinksFor("72311")).toEqual({ kind: "listed", links: cabinetmakers });
  });

  it("says in words that every other job has none, rather than handing back an empty entry or another job's", () => {
    let none = 0;
    for (const job of oasisJobs) {
      const answer = jobLinksFor(job.code);
      if (job.code.startsWith("72311.")) continue;
      expect(answer, job.code).toEqual({ kind: "none", line: jobLinksWords.none });
      none += 1;
    }
    // Every job on the list but Cabinetmakers (900 jobs, one of them Cabinetmakers).
    expect(none).toBe(oasisJobs.length - 1);
    for (const notAJob of ["", "Cabinetmakers", "7231", "72311.0"]) {
      expect(jobLinksFor(notAJob), notAJob).toEqual({ kind: "none", line: jobLinksWords.none });
    }
  });

  it("says it with no verdict and no time", () => {
    for (const line of Object.values(jobLinksWords)) {
      expect(findVerdicts(line), line).toEqual([]);
      expect(findTimeWords(line), line).toEqual([]);
    }
  });
});
