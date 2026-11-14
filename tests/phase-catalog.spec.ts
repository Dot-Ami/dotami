/**
 * The phase catalog (task 48c, story S2.5.48; docs/engines/phases.md): where a business stands, its legal form, and the
 * 33 changes it can go through, each with official sources a tool checked and, for every "leads to", the page that says
 * so. Written from the test list the maintainer read against the CRA's page on 2026-11-12 (task 48b,
 * tests/fixtures/phases/v1.ts), so this test also holds the catalog to that list. No screen reads it yet.
 */
import { describe, expect, it } from "vitest";

import {
  PHASE_LINKS_HELD_BACK,
  phaseCatalogProblems,
  phasesCatalogV2026,
  type PhaseCatalog,
} from "@/lib/engines/phases/v2026";
import { roadsV2026 } from "@/lib/engines/roads/v2026";

import { CHANGES, LEGAL_FORMS, STANDINGS } from "./fixtures/phases/v1";
import { networkSourceFiles, readSource } from "./helpers/source-scan";

const catalog = phasesCatalogV2026;
const today = new Date().toLocaleDateString("en-CA");
const roadIds = roadsV2026.map((road) => road.id);

/** A deep copy to plant a mistake in, so the real catalog is never touched. */
const copy = (): PhaseCatalog => JSON.parse(JSON.stringify(catalog)) as PhaseCatalog;

describe("phase catalog (48c)", () => {
  it("passes every check: ids, sources, forms, where a change starts, and what it leads to", () => {
    expect(phaseCatalogProblems(catalog, { today, roadIds })).toEqual([]);
  });

  it("holds the 4 standings, the 3 legal forms and the 33 changes", () => {
    expect(catalog.standings.map((s) => s.id)).toEqual(["not-started", "running", "paused", "ended"]);
    expect(catalog.legalForms.map((f) => f.id)).toEqual(["own-name", "partnership", "corporation"]);
    expect(catalog.changes).toHaveLength(33);
  });

  // The two checks of the plan's § 3.2, and the ones around them: each planted mistake must be reported, so the
  // check above can fail.
  describe("reports a planted mistake", () => {
    const problems = (c: PhaseCatalog) => phaseCatalogProblems(c, { today, roadIds });

    it("an entry with no source", () => {
      const c = copy();
      c.changes[0].citations = [];
      expect(problems(c).join("\n")).toMatch(/change-address.*no source/);
    });

    it('a "leads to" naming nothing', () => {
      const c = copy();
      c.changes.find((x) => x.id === "change-pausing")!.leadsTo[0].to = "change-nowhere";
      expect(problems(c).join("\n")).toMatch(/change-pausing.*"change-nowhere".*no standing or change/);
    });

    it('a "leads to" with no page that says so', () => {
      const c = copy();
      const link = c.changes.find((x) => x.id === "change-pausing")!.leadsTo[0];
      (link as { citation?: unknown }).citation = undefined;
      expect(problems(c).join("\n")).toMatch(/change-pausing.*paused.*no page/);
    });

    it("a source checked by nobody", () => {
      const c = copy();
      const cited = c.changes[0].citations[0] as { toolCheck?: unknown };
      cited.toolCheck = undefined;
      expect(problems(c).join("\n")).toMatch(/change-address.*neither a read/);
    });

    it("a quote too short for the quote checker", () => {
      const c = copy();
      c.changes[0].citations[0].toolCheck!.quotes = ["two words"];
      expect(problems(c).join("\n")).toMatch(/fewer than 3 words/);
    });

    it("a file in place of a page", () => {
      const c = copy();
      c.changes[0].citations[0].url = "https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/rc145/rc145-25e.pdf";
      expect(problems(c).join("\n")).toMatch(/change-address.*a file/);
    });

    it("a source on a site the phase pages may not come from", () => {
      const c = copy();
      c.changes[0].citations[0].url = "https://www.bdc.ca/en/articles-tools/change-ownership/plan-succession/thinking-about-retiring-how-plan-your-exit";
      expect(problems(c).join("\n")).toMatch(/change-address.*www\.bdc\.ca.*not one of the sites/);
    });

    it("an id used twice", () => {
      const c = copy();
      c.changes[1].id = c.changes[0].id;
      expect(problems(c).join("\n")).toMatch(/"change-address" is used twice/);
    });

    it("a change missing a legal form's answer", () => {
      const c = copy();
      delete (c.changes[0].forms as Partial<Record<string, string>>).partnership;
      expect(problems(c).join("\n")).toMatch(/change-address.*partnership/);
    });

    it("a change that starts from a standing that isn't one", () => {
      const c = copy();
      (c.changes[0].from as unknown as string[]).push("sleeping");
      expect(problems(c).join("\n")).toMatch(/change-address.*"sleeping"/);
    });

    it("a road that isn't written", () => {
      const c = copy();
      c.changes[0].roadId = "road-nowhere";
      expect(problems(c).join("\n")).toMatch(/change-address.*road-nowhere/);
    });

    it("a fold with no label", () => {
      const c = copy();
      c.changes[0].citations[0].fold = { label: " " };
      expect(problems(c).join("\n")).toMatch(/change-address.*fold/);
    });
  });

  // The maintainer read the list in tests/fixtures/phases/v1.ts against the official pages on 2026-11-12 (task 48b):
  // the catalog is that list, with sources checked and every link cited. A difference is listed here on purpose.
  describe("is the list the maintainer read (48b)", () => {
    it("same standings and legal forms, with the same pages", () => {
      expect(catalog.standings.map((s) => [s.id, s.name, s.citations.map((c) => c.url).sort()])).toEqual(
        STANDINGS.map((s) => [s.id, s.name, s.sources.map((p) => p.url).sort()]),
      );
      expect(catalog.legalForms.map((f) => [f.id, f.name, f.inRulesToday, f.citations.map((c) => c.url).sort()])).toEqual(
        LEGAL_FORMS.map((f) => [f.id, f.name, f.inRulesToday, f.sources.map((p) => p.url).sort()]),
      );
    });

    it("same changes: label, group, name, forms, where each starts, its road and its pages", () => {
      const shape = (c: { id: string; group: string; name: string; forms: object; from: readonly string[]; roadId: string | null }) => ({
        id: c.id,
        group: c.group,
        name: c.name,
        forms: c.forms,
        from: [...c.from],
        roadId: c.roadId,
      });
      expect(catalog.changes.map((c) => ({ ...shape(c), label: c.planLabel, pages: c.citations.map((x) => x.url).sort() }))).toEqual(
        CHANGES.map((c) => ({ ...shape(c), label: c.short, pages: c.sources.map((p) => p.url).sort() })),
      );
    });

    it('every "leads to" he read is in the catalog with a page that says so, except the ones held back and listed', () => {
      const read = CHANGES.flatMap((c) => c.leadsTo.map((to) => `${c.id} -> ${to}`));
      const held = PHASE_LINKS_HELD_BACK.map((h) => `${h.from} -> ${h.to}`);
      const inCatalog = catalog.changes.flatMap((c) => c.leadsTo.map((l) => `${c.id} -> ${l.to}`));
      expect(inCatalog).toEqual(read.filter((link) => !held.includes(link)));
      // Each held-back link is one he read, with the reason in plain words.
      for (const h of PHASE_LINKS_HELD_BACK) {
        expect(read).toContain(`${h.from} -> ${h.to}`);
        expect(h.why.trim().length).toBeGreaterThan(10);
      }
    });
  });

  it("no screen reads it yet: only the citations list names it", () => {
    const readers = networkSourceFiles().filter(
      (file) => readSource(file).includes("engines/phases") && !/lib[\\/]engines[\\/](phases[\\/]|all-citations\.ts$)/.test(file),
    );
    expect(readers).toEqual([]);
  }, 60_000);
});
