/**
 * The government's skills list for the job the person picks (docs/architecture/future-cockpit.md § 6,
 * "Skills, and the government's list for your pick of job, as built"; the maintainer's decision 5 of
 * 2026-10-11): OaSIS counts as a source only through the person's own pick of job, every item is tagged
 * "your pick of job" and cited, and no screen gets a rating (names only, the documented default while
 * the maintainer's item 20 is open).
 */
import { describe, expect, it } from "vitest";

import { allCatalogCitations } from "@/lib/engines/all-citations";
import {
  OASIS_ATTRIBUTION,
  OASIS_DATASET_URL,
  OASIS_ITEM_TAG,
  OASIS_LICENCE_URL,
  oasisItemIds,
  oasisJobByCode,
  oasisJobs,
  oasisListForJob,
  searchOasisJobs,
} from "@/lib/engines/oasis/v2026";
import { citationCheckProblems, howChecked } from "@/lib/engines/shared/citation-check";

const TODAY = new Date().toLocaleDateString("en-CA");

/** Every skill and knowledge id that has ever shipped: ids are forever, so removing or renaming one fails. */
const SHIPPED_OASIS_ITEM_IDS = [
  "skill-ca-oasis-f.01.a.01", "skill-ca-oasis-f.01.a.02", "skill-ca-oasis-f.01.a.03", "skill-ca-oasis-f.01.b.01",
  "skill-ca-oasis-f.01.b.02", "skill-ca-oasis-f.01.c.01", "skill-ca-oasis-f.01.c.02", "skill-ca-oasis-f.02.a.01",
  "skill-ca-oasis-f.02.a.02", "skill-ca-oasis-f.02.a.03", "skill-ca-oasis-f.02.b.01", "skill-ca-oasis-f.02.b.03",
  "skill-ca-oasis-f.02.b.05", "skill-ca-oasis-f.03.a.01", "skill-ca-oasis-f.03.a.02", "skill-ca-oasis-f.03.a.03",
  "skill-ca-oasis-f.03.a.04", "skill-ca-oasis-f.03.a.05", "skill-ca-oasis-f.03.a.06", "skill-ca-oasis-f.03.a.07",
  "skill-ca-oasis-f.03.a.08", "skill-ca-oasis-f.03.a.09", "skill-ca-oasis-f.03.a.10", "skill-ca-oasis-f.04.a.01",
  "skill-ca-oasis-f.04.a.02", "skill-ca-oasis-f.04.a.03", "skill-ca-oasis-f.04.b.05", "skill-ca-oasis-f.04.c.01",
  "skill-ca-oasis-f.05.a.01", "skill-ca-oasis-f.05.a.02", "skill-ca-oasis-f.05.a.03", "skill-ca-oasis-f.05.a.04",
  "skill-ca-oasis-f.05.a.05", "skill-ca-oasis-g.01.a.01", "skill-ca-oasis-g.01.a.02", "skill-ca-oasis-g.01.a.03",
  "skill-ca-oasis-g.01.a.04", "skill-ca-oasis-g.01.a.05", "skill-ca-oasis-g.01.a.06", "skill-ca-oasis-g.01.a.07",
  "skill-ca-oasis-g.02.a.01", "skill-ca-oasis-g.03.a.01", "skill-ca-oasis-g.03.a.02", "skill-ca-oasis-g.04.a.01",
  "skill-ca-oasis-g.04.a.02", "skill-ca-oasis-g.04.a.04", "skill-ca-oasis-g.04.a.05", "skill-ca-oasis-g.04.a.06",
  "skill-ca-oasis-g.05.a.02", "skill-ca-oasis-g.05.a.03", "skill-ca-oasis-g.05.a.04", "skill-ca-oasis-g.06.a.01",
  "skill-ca-oasis-g.06.a.02", "skill-ca-oasis-g.06.a.03", "skill-ca-oasis-g.06.a.04", "skill-ca-oasis-g.07.a.01",
  "skill-ca-oasis-g.07.a.02", "skill-ca-oasis-g.07.a.03", "skill-ca-oasis-g.07.a.04", "skill-ca-oasis-g.07.a.05",
  "skill-ca-oasis-g.08.a.01", "skill-ca-oasis-g.08.a.02", "skill-ca-oasis-g.08.a.03", "skill-ca-oasis-g.08.a.05",
  "skill-ca-oasis-g.09.a.01", "skill-ca-oasis-g.09.a.02", "skill-ca-oasis-g.09.a.03", "skill-ca-oasis-g.09.a.04",
  "skill-ca-oasis-g.09.a.05", "skill-ca-oasis-g.10.a.01", "skill-ca-oasis-g.10.a.02", "skill-ca-oasis-g.10.a.03",
  "skill-ca-oasis-g.10.a.04", "skill-ca-oasis-g.10.a.05", "skill-ca-oasis-g.10.a.06", "skill-ca-oasis-g.11.a.01",
  "skill-ca-oasis-g.11.a.02",
];

/** The fields a list item may carry, and nothing else: no rating can ride along to a screen. */
const ITEM_KEYS = ["citations", "group", "id", "kind", "label", "tag"];

describe("the jobs a person can pick", () => {
  it("are the dataset's 900 job profiles, each with its code and name", () => {
    expect(oasisJobs).toHaveLength(900);
    expect(new Set(oasisJobs.map((j) => j.code)).size).toBe(900);
    expect(oasisJobByCode("72311.00")).toEqual({ code: "72311.00", label: "Cabinetmakers" });
    expect(oasisJobByCode("99999.99")).toBeUndefined();
  });

  it("are searched by every word typed, each anywhere in the name whatever its capitals or the start of the code; ten shown at most, in the dataset's order, with the count of all that match", () => {
    expect(searchOasisJobs("cabinet").jobs).toContainEqual({ code: "72311.00", label: "Cabinetmakers" });
    expect(searchOasisJobs("CABINETMAKERS")).toEqual({ jobs: [{ code: "72311.00", label: "Cabinetmakers" }], total: 1 });
    expect(searchOasisJobs("72311")).toEqual({ jobs: [{ code: "72311.00", label: "Cabinetmakers" }], total: 1 });
    const many = searchOasisJobs("manager");
    expect(many.jobs.length).toBe(10);
    // Every job whose name holds "manager", counted from the list itself, not a number written here.
    expect(many.total).toBe(oasisJobs.filter((j) => j.label.toLowerCase().includes("manager")).length);
    expect(many.total).toBeGreaterThan(10);
    expect(many.jobs.map((j) => j.code)).toEqual([...many.jobs.map((j) => j.code)].sort());
    expect(searchOasisJobs("")).toEqual({ jobs: [], total: 0 });
    expect(searchOasisJobs("   ")).toEqual({ jobs: [], total: 0 });
    expect(searchOasisJobs("no job is called this")).toEqual({ jobs: [], total: 0 });
  });

  it("find a job from everyday words, each anywhere in its name, never scored", () => {
    expect(searchOasisJobs("restaurant manager").jobs).toContainEqual({ code: "60030.00", label: "Restaurant and food service managers" });
    expect(searchOasisJobs("hair stylist").jobs).toContainEqual({ code: "63210.01", label: "Hairstylists" });
    expect(searchOasisJobs("heavy duty mechanic").jobs).toContainEqual({ code: "72401.00", label: "Heavy-duty equipment mechanics" });
    expect(searchOasisJobs("Mechanic  heavy").jobs).toContainEqual({ code: "72401.00", label: "Heavy-duty equipment mechanics" });
    // A word that is in no name is still no match: every word must be there.
    expect(searchOasisJobs("cabinet daycare").total).toBe(0);
  });
});

describe("the list for a picked job", () => {
  // Slow on purpose: it walks all 900 jobs' lists, about 25,000 items, checking each one's citation.
  it("every item of every job carries the tag 'your pick of job' and the dataset's citation, and nothing else", { timeout: 30_000 }, () => {
    let items = 0;
    for (const job of oasisJobs) {
      const list = oasisListForJob(job.code)!;
      expect(list.code).toBe(job.code);
      expect(list.label).toBe(job.label);
      for (const item of list.items) {
        items += 1;
        expect(Object.keys(item).sort()).toEqual(ITEM_KEYS);
        expect(item.tag).toBe(OASIS_ITEM_TAG);
        expect(item.kind).toBe("listed-skill");
        expect(["skills", "knowledge"]).toContain(item.group);
        expect(item.citations).toHaveLength(1);
        const citation = item.citations[0]!;
        expect(citation.url).toBe(OASIS_DATASET_URL);
        expect(citation.authority).toBe("federal");
        expect(citation.jurisdiction).toBe("CA");
        // Option B: checked by a tool, never a read nobody made.
        expect(citation.lastVerified).toBeUndefined();
        expect(citation.readBy).toBeUndefined();
        expect(howChecked(citation).kind).toBe("tool");
        expect(citationCheckProblems(citation, TODAY)).toEqual([]);
        // The note names the file the item came from and the job it is for.
        expect(citation.note).toContain(job.code);
        expect(citation.note).toContain(item.group === "skills" ? "skills_oasis_2025_v1.1.csv" : "knowledge_oasis_2025_v.1.1.csv");
        expect(citation.title).toContain("OaSIS");
      }
    }
    expect(items).toBeGreaterThan(20_000);
  });

  it("Cabinetmakers: the 31 skills and 13 knowledge areas the government rates 1 or more, in the taxonomy's order", () => {
    const list = oasisListForJob("72311.00")!;
    const skills = list.items.filter((i) => i.group === "skills");
    const knowledge = list.items.filter((i) => i.group === "knowledge");
    expect([skills.length, knowledge.length]).toEqual([31, 13]);
    const labels = list.items.map((i) => i.label);
    expect(labels).toEqual(expect.arrayContaining(["Numeracy", "Equipment and Tool Selection", "Building and Construction", "Mathematics"]));
    // Rated 0, "Not applicable" on the government's own profile: left out.
    for (const left of ["Digital Literacy", "Digital Systems Production", "Accounting", "Law"]) expect(labels).not.toContain(left);
    expect(labels[0]).toBe("Oral Communication: Active Listening");
    // The dataset's own order, never by rating.
    const order = list.items.map((i) => oasisItemIds.indexOf(i.id));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("is nothing for a code that isn't a job", () => {
    expect(oasisListForJob("99999.99")).toBeNull();
    expect(oasisListForJob("")).toBeNull();
  });

  it("uses one permanent id per skill or knowledge area, shared by every job, and never drops one", () => {
    expect(oasisItemIds).toEqual(SHIPPED_OASIS_ITEM_IDS);
    const numeracy = (code: string) => oasisListForJob(code)!.items.find((i) => i.label === "Numeracy")?.id;
    expect(numeracy("72311.00")).toBe("skill-ca-oasis-f.01.c.01");
    expect(numeracy("00010.00")).toBe("skill-ca-oasis-f.01.c.01");
  });
});

describe("its sources and licence", () => {
  it("are checked again with every other source by scripts/check-quotes.mjs", () => {
    const oasis = allCatalogCitations().filter((c) => c.where.startsWith("oasis "));
    expect(oasis.map((c) => c.where)).toEqual(["oasis dataset", "oasis not-applicable", "oasis licence"]);
    for (const { citation } of oasis) expect(citation.toolCheck?.quotes.length).toBeGreaterThan(0);
    const dataset = oasis[0]!.citation.toolCheck!.quotes;
    expect(dataset).toEqual(
      expect.arrayContaining(["Licence: Open Government Licence - Canada", "Record Modified: 2026-10-04", "skills_oasis_2025_v1.1.csv Skills 2025"]),
    );
    expect(oasis[1]!.citation.toolCheck!.quotes).toContain("0 – Not applicable");
  });

  it("carry the licence's own attribution line and its address", () => {
    expect(OASIS_ATTRIBUTION).toBe("Contains information licensed under the Open Government Licence – Canada.");
    expect(OASIS_LICENCE_URL).toBe("https://open.canada.ca/en/open-government-licence-canada");
  });
});
