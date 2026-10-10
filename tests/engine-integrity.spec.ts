import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { describe, expect, it } from "vitest";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { complianceCatalogV2026 } from "@/lib/engines/compliance/v2026";
import { grantsCatalogV2026 } from "@/lib/engines/grants/v2026";
import { riskCatalogV2026 } from "@/lib/engines/risk/v2026";
import { structureCatalogV2026 } from "@/lib/engines/structure/v2026";
import { taxLinesCatalogV2026 } from "@/lib/engines/taxlines/v2026";
import { templatesCatalogV2026 } from "@/lib/engines/templates/v2026";
import { writeOffsCatalogV2026 } from "@/lib/engines/writeoffs/v2026";
import { NODE_ENGINE_HINTS } from "@/lib/brain/node-items";
import { defaultActiveBranches } from "@/lib/scenarios/branches";
import { T2125_LINES } from "@/lib/figures/return/lines";
import { FIGURE_KINDS } from "@/lib/figures/types";

describe("engine catalog integrity", () => {
  it("CFE has unique ids, citations, and 10 nodes", () => {
    expect(cfeCatalogV2026.lastVerified).toBeTruthy();
    const ids = cfeCatalogV2026.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(cfeCatalogV2026.nodes).toHaveLength(10);
    expect(cfeCatalogV2026.nodes.some((n) => n.stage === "stage-4")).toBe(true);

    for (const node of cfeCatalogV2026.nodes) {
      expect(node.citations.length).toBeGreaterThan(0);
      for (const citation of node.citations) {
        expect(citation.url).toMatch(/^https:\/\//);
        expect(citation.lastVerified).toBeTruthy();
      }
    }
  });

  it("every corpus pointer names a registered source and a label the store's parser produces (S2.5.4i)", () => {
    // Labels are section numbers ("20", "67.1", "1100") or Schedule items ("Sch. II Class 50");
    // sub-paths are bracketed markers only. A pointer outside this shape would 404 on screen.
    const SOURCES = new Set(["ita", "itr", "cbca", "abca"]);
    const LABEL = /^([0-9]+(\.[0-9]+)?[A-Z]?|Sch\. [IVX]+ Class [0-9]+(\.[0-9]+)?)$/;
    const SUB = /^(\([0-9a-z.]{1,8}\)){1,4}$/;
    let pointers = 0;
    for (const entry of writeOffsCatalogV2026.entries) {
      for (const citation of entry.citations) {
        const isStatute = /^Income Tax (Act|Regulations)/.test(citation.title);
        if (isStatute) expect(citation.corpus?.length ?? 0).toBeGreaterThan(0);
        for (const p of citation.corpus ?? []) {
          pointers += 1;
          expect(SOURCES.has(p.source)).toBe(true);
          expect(p.label).toMatch(LABEL);
          if (p.sub) expect(p.sub).toMatch(SUB);
        }
      }
    }
    expect(pointers).toBeGreaterThanOrEqual(9);
  });

  const entryCatalogs = [
    { name: "Structure", catalog: structureCatalogV2026 },
    { name: "Grants", catalog: grantsCatalogV2026 },
    { name: "Write-offs", catalog: writeOffsCatalogV2026 },
    { name: "Compliance", catalog: complianceCatalogV2026 },
    { name: "Templates", catalog: templatesCatalogV2026 },
    { name: "Risk", catalog: riskCatalogV2026 },
  ];

  for (const { name, catalog } of entryCatalogs) {
    it(`${name} has unique ids and citations`, () => {
      expect(catalog.lastVerified).toBeTruthy();
      const ids = catalog.entries.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const entry of catalog.entries) {
        expect(entry.citations.length).toBeGreaterThan(0);
        for (const citation of entry.citations) {
          expect(citation.url).toMatch(/^https:\/\//);
          expect(citation.lastVerified).toBeTruthy();
        }
      }
    });
  }

  it("risk entries resolve appliesTo/combination ids and carry mitigation", () => {
    const knownIds = new Set([
      ...grantsCatalogV2026.entries.map((e) => e.id),
      ...writeOffsCatalogV2026.entries.map((e) => e.id),
      ...complianceCatalogV2026.entries.map((e) => e.id),
      ...structureCatalogV2026.entries.map((e) => e.id),
    ]);

    for (const entry of riskCatalogV2026.entries) {
      expect(entry.appliesTo.length).toBeGreaterThan(0);
      for (const target of entry.appliesTo) {
        expect(knownIds.has(target)).toBe(true);
      }
      expect(entry.why.length).toBeGreaterThan(0);
      expect(entry.mitigation.length).toBeGreaterThan(0);
      // GAAR discipline: the flag is reserved for professional-required structures.
      if (entry.gaarExposure) {
        expect(entry.severity).toBe("professional-required");
      }
    }

    for (const combo of riskCatalogV2026.combinations) {
      expect(combo.memberIds.length).toBeGreaterThan(1);
      for (const member of combo.memberIds) {
        expect(knownIds.has(member)).toBe(true);
      }
    }
  });

  it("time-boxed write-off incentives carry complete date data", () => {
    for (const entry of writeOffsCatalogV2026.entries) {
      if (entry.firstYearIncentive) {
        expect(entry.firstYearIncentive.availableForUseBefore).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.firstYearIncentive.note.toLowerCase()).toContain("accountant");
      }
    }
  });

  it("the default branch bundle and node hints point at real catalog ids (S2.5.4h)", () => {
    const grantIds = new Set(grantsCatalogV2026.entries.map((g) => g.id));
    const writeOffIds = new Set(writeOffsCatalogV2026.entries.map((w) => w.id));
    const complianceIds = new Set(complianceCatalogV2026.entries.map((c) => c.id));
    const cfeIds = new Set(cfeCatalogV2026.nodes.map((n) => n.id));

    for (const id of Object.values(defaultActiveBranches)) {
      expect(cfeIds.has(id)).toBe(true);
    }
    for (const [nodeId, entryIds] of Object.entries(NODE_ENGINE_HINTS)) {
      expect(cfeIds.has(nodeId as (typeof cfeCatalogV2026.nodes)[number]["id"])).toBe(true);
      for (const id of entryIds ?? []) {
        expect(grantIds.has(id) || writeOffIds.has(id) || complianceIds.has(id)).toBe(true);
      }
    }
  });
});

// [8f] The tax-line catalog: which CRA line each tax-form figure kind goes on, one read year at a time.
describe("tax-line catalog ([8f])", () => {
  const entries = taxLinesCatalogV2026.entries;

  it("has unique permanent ids, none built from a line number", () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of entries) {
      // Line numbers move between years (the maintainer chose descriptive ids, 2026-10-07): the
      // form's name may be in an id, a line number may not.
      expect(entry.id).toMatch(/^[a-z0-9]+(-[a-z]+)+$/);
      expect(entry.id.startsWith(`${entry.form.toLowerCase()}-`)).toBe(true);
      for (const year of entry.yearsRead) expect(entry.id).not.toContain(year.line);
      expect(entry.figureKind).not.toMatch(/\d/);
    }
  });

  it("is the four T2125 totals, 8299, 9368, 9369 and 9946 on the 2025 form, each kept as its own descriptive kind", () => {
    expect(entries.map((e) => [e.figureKind, e.yearsRead.find((y) => y.taxYear === 2025)?.line])).toEqual([
      ["business-gross-income", "8299"],
      ["business-total-expenses", "9368"],
      ["business-net-income-before-adjustments", "9369"],
      ["business-net-income", "9946"],
    ]);
    // Every catalog kind is a real figure kind, and each kind has at most one line.
    const kinds = entries.map((e) => e.figureKind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const k of kinds) expect(FIGURE_KINDS as readonly string[]).toContain(k);
    // gross-revenue is the GST/HST card's total, not a form line.
    expect(kinds).not.toContain("gross-revenue");
  });

  it("every read year is cited and dated, starting with 2025, the form itself first", () => {
    for (const entry of entries) {
      expect(entry.yearsRead.length).toBeGreaterThan(0);
      expect(entry.yearsRead.map((y) => y.taxYear)).toContain(2025);
      expect(entry.description.trim()).not.toBe("");
      const years = entry.yearsRead.map((y) => y.taxYear);
      expect(new Set(years).size).toBe(years.length);
      for (const year of entry.yearsRead) {
        expect(year.line).toMatch(/^\d{4,5}$/);
        expect(year.printedLabel.trim()).not.toBe("");
        expect(year.formVersion).toBe(`${entry.form} E (${String(year.taxYear).slice(2)})`);
        expect(year.citations.length).toBeGreaterThan(0);
        // The first citation is that year's form; lib/figures/tax-line.ts shows its date.
        expect(year.citations[0].url).toContain(`t2125-${String(year.taxYear).slice(2)}e.pdf`);
        for (const c of year.citations) {
          expect(c.url).toMatch(/^https:\/\/www\.canada\.ca\//);
          expect(c.authority).toBe("CRA");
          expect(c.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          // The note quotes the line it vouches for, so a citation can't sit under the wrong line.
          if (c === year.citations[0]) expect(c.note).toContain(`Line ${year.line}`);
        }
      }
    }
  });

  it("is the one list of lines: the return reader reads its numbers and labels from here", () => {
    expect(T2125_LINES.map((l) => [l.line, l.label, l.kind])).toEqual(
      entries.map((e) => {
        const newest = e.yearsRead[e.yearsRead.length - 1];
        return [newest.line, newest.printedLabel, e.figureKind];
      }),
    );
    // The check above can't tell a derived list from a hand-copied one with the same numbers, so
    // also make sure the reader's file has no line number written out as a value of its own
    // (the header comment names them, which is fine; a quoted "8299" would be a second copy).
    const source = readFileSync(join(process.cwd(), "lib/figures/return/lines.ts"), "utf8");
    expect(source).toContain("taxLinesCatalogV2026");
    for (const e of entries) {
      for (const year of e.yearsRead) {
        expect(source).not.toMatch(new RegExp(`["'\`]${year.line}["'\`]`));
      }
    }
  });
});

// S2.5.4f — statute-check status is DATA, not prose. A partial citation must say what is missing.
describe("citation verification (S2.5.4f)", () => {
  it("every stamped citation has a valid status and a method; partial ones name the gap", () => {
    const stamped: EngineCitation[] = writeOffsCatalogV2026.entries.flatMap((e) => e.citations.filter((c) => c.verification));
    // 7 Income Tax Act citations (S2.5.2f) + 2 Income Tax Regulations citations (S2.5.2g)
    expect(stamped.length).toBe(9);
    for (const c of stamped) {
      expect(["confirmed", "supported", "partial"]).toContain(c.verification!.status);
      expect(c.verification!.method.length).toBeGreaterThan(20);
      if (c.verification!.status === "partial") {
        expect(c.verification!.method).toMatch(/Regulations/);
      }
    }
    // S2.5.2g closed the Regulations gap: nothing is PARTIAL any more, and the two CCA
    // entries each carry a CONFIRMED Regulations citation naming its class and rate.
    const partialEntries = writeOffsCatalogV2026.entries
      .filter((e) => (e.citations as EngineCitation[]).some((c) => c.verification?.status === "partial"))
      .map((e) => e.id);
    expect(partialEntries).toEqual([]);
    for (const id of ["writeoff-cca-class-50", "writeoff-capital-equipment"]) {
      const entry = writeOffsCatalogV2026.entries.find((e) => e.id === id)!;
      const reg = entry.citations.find((c) => /Income Tax Regulations/.test(c.title));
      expect(reg?.verification?.status).toBe("confirmed");
      expect(reg?.verification?.method).toMatch(/per cent/);
    }
  });
});
