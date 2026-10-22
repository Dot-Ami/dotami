/**
 * The economic-region key (lib/engines/research-kit/v2026/economic-regions.ts; task 25e): Alberta's eight
 * regions exactly as research 25s read them from Statistics Canada's pages, the data the region question
 * (docs/ui-spec/futures/02-where-you-are.md, part 2b) lists, and a reading of the person's answer that never
 * works a region out from their area.
 */
import { describe, expect, it } from "vitest";

import {
  ALBERTA_ECONOMIC_REGIONS,
  ALBERTA_REGIONS_PAGE,
  DONT_KNOW_REGION,
  ECONOMIC_REGIONS_SOURCE_ID,
  economicRegionsCreditLine,
  economicRegionsIn,
  REGION_QUESTION_PROVINCES,
  regionNameOnScreen,
  regionThePersonPicked,
} from "@/lib/engines/research-kit/v2026/economic-regions";
import { SOURCES } from "@/lib/engines/research-kit/v2026/registry";

/**
 * Research note 25s, "Alberta's eight economic regions and their census divisions" (read 2026-10-20 from the
 * variant's Alberta page and each region's own page; the verifier fetched all eight and they matched).
 */
const RESEARCH_25S: readonly [string, string][] = [
  ["4810", "Lethbridge--Medicine Hat"],
  ["4820", "Camrose--Drumheller"],
  ["4830", "Calgary"],
  ["4840", "Banff--Jasper--Rocky Mountain House"],
  ["4850", "Red Deer"],
  ["4860", "Edmonton"],
  ["4870", "Athabasca--Grande Prairie--Peace River"],
  ["4880", "Wood Buffalo--Cold Lake"],
];

/**
 * The areas the area question keeps (02-where-you-are.md, What is kept), its "I don't know" left out: that one
 * is the same word as the region's own "I don't know", and the two are kept in separate columns.
 */
const AREA_ANSWERS = ["cma-825", "cma-835", "cma-810", "cma-830", "ab-elsewhere"];

describe("Alberta's economic regions", () => {
  it("are the eight research 25s read, codes and names exactly as published, in Statistics Canada's code order", () => {
    expect(ALBERTA_ECONOMIC_REGIONS.map((r) => [r.code, r.name])).toEqual(RESEARCH_25S);
    expect(ALBERTA_ECONOMIC_REGIONS.every((r) => r.province === "AB")).toBe(true);
    const codes = ALBERTA_ECONOMIC_REGIONS.map((r) => r.code);
    expect(codes).toEqual([...codes].sort());
  });

  it("come from the registry's card, with its source page, licence and credit line", () => {
    const card = SOURCES.find((c) => c.id === ECONOMIC_REGIONS_SOURCE_ID)!;
    expect(card.publisher).toBe("Statistics Canada");
    expect(card.licence).toBe("statcan-open-licence");
    expect(card.keyedBy).toEqual(["economic-region", "province"]);
    expect(card.files!.map((f) => f.url)).toEqual([ALBERTA_REGIONS_PAGE]);
    expect(economicRegionsCreditLine()).toBe(
      "Adapted from Statistics Canada, Variant of Standard Geographical Classification (SGC) 2021 for Economic Regions, 2021. This does not constitute an endorsement by Statistics Canada of this product.",
    );
  });

  it("are listed for Alberta only: no region question anywhere else for now (the maintainer's call 2, 2026-10-21)", () => {
    expect(REGION_QUESTION_PROVINCES).toEqual(["AB"]);
    expect(economicRegionsIn("AB")).toBe(ALBERTA_ECONOMIC_REGIONS);
    for (const elsewhere of ["BC", "ON", "SK", "YT", null]) expect(economicRegionsIn(elsewhere), String(elsewhere)).toEqual([]);
  });

  it("are drawn with an en dash where the published name has a double hyphen", () => {
    expect(regionNameOnScreen("Lethbridge--Medicine Hat")).toBe("Lethbridge–Medicine Hat");
    expect(regionNameOnScreen("Banff--Jasper--Rocky Mountain House")).toBe("Banff–Jasper–Rocky Mountain House");
    expect(regionNameOnScreen("Calgary")).toBe("Calgary");
  });
});

describe("the region the person picked", () => {
  it("is the region they picked, read against their province's list", () => {
    expect(regionThePersonPicked("4830", "AB")).toEqual({ kind: "region", region: { code: "4830", name: "Calgary", province: "AB" } });
    expect(regionThePersonPicked("4820", "AB")).toEqual({
      kind: "region",
      region: { code: "4820", name: "Camrose--Drumheller", province: "AB" },
    });
  });

  it("is \"I don't know\" when they said so, kept as their answer", () => {
    expect(regionThePersonPicked(DONT_KNOW_REGION, "AB")).toEqual({ kind: "dont-know" });
  });

  it("is not picked when nothing is kept: never a region filled in for them", () => {
    expect(regionThePersonPicked(null, "AB")).toEqual({ kind: "not-picked" });
    expect(regionThePersonPicked("", "AB")).toEqual({ kind: "not-picked" });
    expect(regionThePersonPicked(null, "ON")).toEqual({ kind: "not-picked" });
  });

  it("never turns an area into a region, even an area that sits wholly in one (Calgary, Lethbridge, Red Deer)", () => {
    // It takes the kept region and the province, and nothing else: there is no way to hand it an area.
    expect(regionThePersonPicked.length).toBe(2);
    for (const area of AREA_ANSWERS) {
      expect(regionThePersonPicked(area, "AB"), area).toEqual({ kind: "not-on-the-list", kept: area });
    }
  });

  it("says when what is kept isn't one of the province's regions, rather than guessing one", () => {
    expect(regionThePersonPicked("4830", "ON")).toEqual({ kind: "not-on-the-list", kept: "4830" });
    expect(regionThePersonPicked("3530", "AB")).toEqual({ kind: "not-on-the-list", kept: "3530" });
    expect(regionThePersonPicked("ER4830", "AB")).toEqual({ kind: "not-on-the-list", kept: "ER4830" });
    expect(regionThePersonPicked("48", "AB")).toEqual({ kind: "not-on-the-list", kept: "48" });
  });
});
