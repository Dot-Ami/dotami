/**
 * The source registry (docs/architecture/research-kit.md § 5.2; lib/engines/research-kit/v2026/): one card for
 * every outside source the kit imports or links in phases 2 and 3, each with every field the design names,
 * checked by the validator. The planted cards below are the receipts that the validator still catches each kind
 * of mistake: a missing field, an unknown licence, a vendor's estimate feeding a total, and a source whose terms
 * bar scripts marked as something DotAmi fetches.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";

import { catalogFreshness } from "@/lib/engines/research-kit/v2026/freshness";
import { LICENCES, SOURCES } from "@/lib/engines/research-kit/v2026/registry";
import type { SourceCard } from "@/lib/engines/research-kit/v2026/types";
import { REQUIRED_FIELDS, fetchedAddresses, isUnder, validateRegistry } from "@/lib/engines/research-kit/v2026/validate";
import { linksOn, neverAutomated } from "@/lib/engines/research-kit/v2026/views";
import { researchKitWords } from "@/lib/engines/research-kit/v2026/words";
import { AD_LIBRARIES } from "@/lib/landscape/words";

import { NOC_FILES } from "../scripts/import-noc.mjs";
import { OASIS_FILES } from "../scripts/import-oasis.mjs";
import { OASIS_TITLES_FILES } from "../scripts/import-oasis-titles.mjs";
import { SOURCE_FILES, importedModules, networkCalls, readSource, sourceFiles } from "./helpers/source-scan";
import { findVerdicts } from "./helpers/verdict-words";

/** A fixed today, so the "seen after today" rule reads the same on every run. */
const TODAY = "2026-10-20";

const card = (id: string): SourceCard => {
  const found = SOURCES.find((c) => c.id === id);
  if (!found) throw new Error(`no card ${id}`);
  return found;
};
const check = (cards: readonly SourceCard[]) => validateRegistry(cards, LICENCES, TODAY);

describe("the registry", () => {
  it("passes its own validator", () => {
    expect(check(SOURCES)).toEqual([]);
  });

  it("has a card for every source the kit imports or links in phases 2 and 3, and the never-automated sites", () => {
    expect(SOURCES.map((c) => c.id)).toEqual([
      "oasis-2025",
      "oasis-2025-example-titles",
      "noc-2021-elements",
      "job-bank-wages",
      "naics-2022",
      "sgc-2021-economic-regions",
      "statcan-business-counts",
      "statcan-census-98-10-0594",
      "meta-ad-library",
      "google-ads-transparency-center",
      "job-bank-pages",
      "yellowpages-ca",
      "canada411",
      "google-maps-consumer",
      "dozr",
      "kijiji",
    ]);
  });

  it("marks when each source comes in: OaSIS's four files, the two job-title files and Alberta's economic regions now (since 2026-10-21), wages in phase 2, the industry list, counts and census later", () => {
    const phaseOf = Object.fromEntries(SOURCES.filter((c) => c.access === "ship").map((c) => [c.id, c.phase]));
    expect(phaseOf).toEqual({
      "oasis-2025": "now",
      "oasis-2025-example-titles": "now",
      "noc-2021-elements": "now",
      "job-bank-wages": "phase-2",
      // With the industry question, in phase 3 (the maintainer's call of 2026-10-20).
      "naics-2022": "phase-3",
      // Typed from Statistics Canada's pages for the region question (task 25e).
      "sgc-2021-economic-regions": "now",
      "statcan-business-counts": "phase-3",
      "statcan-census-98-10-0594": "phase-3",
    });
  });

  it("lists the four OaSIS files the importer reads, at the addresses it downloads from", () => {
    expect(card("oasis-2025").files).toEqual(OASIS_FILES.map((f) => ({ name: f.name, url: f.url })));
  });

  it("lists the two job-title files their importers read, at the addresses they download from", () => {
    expect(card("oasis-2025-example-titles").files).toEqual(OASIS_TITLES_FILES.map((f) => ({ name: f.name, url: f.url })));
    expect(card("noc-2021-elements").files).toEqual(NOC_FILES.map((f) => ({ name: f.name, url: f.url })));
  });

  it("marks as shipped now exactly the three sources an importer reads today, and Alberta's economic regions (typed from Statistics Canada's pages)", () => {
    const shippedNow = SOURCES.filter((c) => c.access === "ship" && c.phase === "now").map((c) => c.id);
    expect(shippedNow.sort()).toEqual(["noc-2021-elements", "oasis-2025", "oasis-2025-example-titles", "sgc-2021-economic-regions"]);
  });

  it("gives every shipped source an open licence and its credit line, and the government files their licence's own words", () => {
    for (const c of SOURCES.filter((s) => s.access === "ship")) {
      expect(LICENCES[c.licence].open).toBe(true);
      expect(c.creditLine).toBeTruthy();
    }
    expect(card("oasis-2025").creditLine).toBe("Contains information licensed under the Open Government Licence – Canada.");
    expect(card("noc-2021-elements").creditLine).toBe(
      "Adapted from Statistics Canada, National Occupational Classification (NOC) 2021 Version 1.0, {period}. This does not constitute an endorsement by Statistics Canada of this product.",
    );
  });

  it("never lets a figure from a link, or from a page DotAmi never fetches, reach DotAmi", () => {
    for (const c of SOURCES.filter((s) => s.access === "link" || s.access === "never-automated")) {
      expect([c.id, c.feeds, c.figureKind]).toEqual([c.id, [], "none"]);
    }
  });
});

describe("the never-automated list, one for every story, and the ad libraries are views over it", () => {
  it("holds Job Bank's pages, YellowPages.ca, Canada411, Google Maps' consumer site, DOZR, Kijiji, Meta and Google's Ads Transparency Center", () => {
    expect(neverAutomated().map((c) => c.id).sort()).toEqual(
      [
        "canada411",
        "dozr",
        "google-ads-transparency-center",
        "google-maps-consumer",
        "job-bank-pages",
        "kijiji",
        "meta-ad-library",
        "yellowpages-ca",
      ].sort(),
    );
    // Each with the words that bar scripts, read on the site's own terms page; except Google's Ads Transparency
    // Center, which is on the list because its terms couldn't be read at all (the maintainer's call 5, 2026-10-21).
    for (const c of neverAutomated()) {
      if (c.id === "google-ads-transparency-center") expect([c.checkedBy, c.termsQuote]).toEqual(["not-read", null]);
      else expect(c.termsQuote, c.id).toBeTruthy();
    }
  });

  it("never fetches Google's Ads Transparency Center, and still links to it (the maintainer's call 5, 2026-10-21)", () => {
    const ads = card("google-ads-transparency-center");
    expect(ads.access).toBe("never-automated");
    expect(ads.neverFetch).toContain("https://adstransparency.google.com");
    expect(linksOn("ad-libraries")).toContainEqual({ label: "Google's Ads Transparency Center", url: "https://adstransparency.google.com/" });
    // A card that would fetch one of its pages, beside the real card, is refused.
    const scraped: SourceCard = {
      ...card("job-bank-wages"),
      id: "planted-ads-scrape",
      files: [{ name: "ads.csv", url: "https://adstransparency.google.com/advertiser/AR00000000000000000000?region=CA" }],
    };
    expect(check([scraped, ads])).toEqual([
      "planted-ads-scrape: is ship and would fetch https://adstransparency.google.com/advertiser/AR00000000000000000000?region=CA, which the google-ads-transparency-center card marks never-automated",
    ]);
  });

  it("bars Job Bank's pages, but ships its wage file from open.canada.ca", () => {
    const pages = card("job-bank-pages");
    expect(fetchedAddresses(card("job-bank-wages")).every((url) => !pages.neverFetch!.some((p) => isUnder(url, p)))).toBe(true);
    expect(fetchedAddresses(card("job-bank-wages"))[0]).toMatch(/^https:\/\/open\.canada\.ca\//);
  });

  it("gives 'Others in this line of work' its two ad-library links from the registry, in the same words as before", () => {
    expect(AD_LIBRARIES).toEqual(linksOn("ad-libraries"));
    expect(AD_LIBRARIES).toEqual([
      { label: "Meta's Ad Library", url: "https://www.facebook.com/ads/library/" },
      { label: "Google's Ads Transparency Center", url: "https://adstransparency.google.com/" },
    ]);
  });

  it("reads an address as under a barred one only at a boundary", () => {
    expect(isUnder("https://www.jobbank.gc.ca/jobsearch", "https://www.jobbank.gc.ca")).toBe(true);
    expect(isUnder("https://www.jobbank.gc.ca", "https://www.jobbank.gc.ca")).toBe(true);
    expect(isUnder("https://www.jobbank.gc.ca.example.com/", "https://www.jobbank.gc.ca")).toBe(false);
  });
});

// ---- Planted failures: the validator still catches each kind -----------------------------------------------

describe("the validator refuses", () => {
  const oasis = card("oasis-2025");

  it("a card missing any field § 5.2 names, naming the field", () => {
    for (const field of REQUIRED_FIELDS) {
      const planted = { ...oasis } as Record<string, unknown>;
      delete planted[field];
      const id = field === "id" ? "card 1" : "oasis-2025";
      expect(check([planted as unknown as SourceCard]), field).toEqual([`${id}: missing ${field}`]);
    }
  });

  it("a licence the registry doesn't know", () => {
    const planted = { ...oasis, licence: "cc-by-4.0" } as unknown as SourceCard;
    expect(check([planted])).toEqual(['oasis-2025: unknown licence "cc-by-4.0"']);
  });

  it("a vendor's estimate feeding a gauge or a total, but not one shown as the vendor's own", () => {
    const vendor: SourceCard = { ...oasis, id: "planted-vendor", figureKind: "vendor-estimate", feeds: ["total"] };
    expect(check([vendor])).toEqual(["planted-vendor: is a vendor's estimate, and feeds a gauge or a total"]);
    expect(check([{ ...vendor, feeds: ["gauge"] }])).toEqual(["planted-vendor: is a vendor's estimate, and feeds a gauge or a total"]);
    expect(check([{ ...vendor, feeds: ["shown"] }])).toEqual([]);
  });

  it("a never-automated source marked as something DotAmi fetches", () => {
    // Job Bank's pages turned into a page DotAmi reads: it still bars its own addresses, so it is refused.
    const fetched: SourceCard = { ...card("job-bank-pages"), access: "page-person-opens" };
    const refused = check([fetched]);
    expect(refused).toContain("job-bank-pages: bars addresses but isn't never-automated");
    // A shipped file on a barred site, beside the card that bars it.
    const scraped: SourceCard = {
      ...card("job-bank-wages"),
      id: "planted-job-bank-scrape",
      files: [{ name: "jobs.csv", url: "https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=cabinetmaker" }],
    };
    expect(check([scraped, card("job-bank-pages")])).toEqual([
      "planted-job-bank-scrape: is ship and would fetch https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=cabinetmaker, which the job-bank-pages card marks never-automated",
    ]);
    // And the Lens reading YellowPages.ca, a page the person opens there.
    const lens: SourceCard = { ...card("yellowpages-ca"), id: "planted-yp-page", access: "page-person-opens", neverFetch: undefined };
    expect(check([lens, card("yellowpages-ca")])).toEqual([
      "planted-yp-page: is page-person-opens and would fetch https://www.yellowpages.ca/, which the yellowpages-ca card marks never-automated",
    ]);
  });

  it("a live look-up whose terms nobody has read", () => {
    const planted: SourceCard = { ...card("google-ads-transparency-center"), access: "lens-live", keyHolder: "person" };
    expect(check([planted])).toContain("google-ads-transparency-center: is lens-live with terms nobody has read");
  });

  it("a day in the future, a credit line with an unknown placeholder, and a shipped source with no credit line", () => {
    expect(check([{ ...oasis, seenOn: "2026-10-21" }])).toEqual(["oasis-2025: seenOn 2026-10-21 is after today"]);
    expect(check([{ ...oasis, creditLine: "Contains {product}." }])).toEqual(["oasis-2025: unknown placeholder {product} in the credit line"]);
    expect(check([{ ...oasis, creditLine: null }])).toEqual(["oasis-2025: ships with no credit line"]);
  });
});

// ---- Network-free ------------------------------------------------------------------------------------------

describe("the registry's folder", () => {
  const files = sourceFiles([path.join("lib", "engines", "research-kit").replace(/\\/g, "/")], SOURCE_FILES);

  it("is found by the scan", () => {
    expect(files).toEqual(
      ["economic-regions.ts", "freshness.ts", "job-links.ts", "registry.ts", "types.ts", "validate.ts", "views.ts", "words.ts"].map(
        (f) => `lib/engines/research-kit/v2026/${f}`,
      ),
    );
  });

  it("imports nothing from outside itself, so no network module can get in, and makes no request", () => {
    for (const file of files) {
      const source = readSource(file);
      expect(
        importedModules(source, file).filter((m) => !m.startsWith("./")),
        file,
      ).toEqual([]);
      expect(networkCalls(source, [], file), file).toEqual([]);
    }
  });

  it("the scan would see one if it were there", () => {
    expect(importedModules('import https from "node:https";\nexport const x = 1;', "planted.ts")).toEqual(["node:https"]);
    expect(networkCalls('export const go = () => fetch("https://example.com");', [], "planted.ts")).not.toEqual([]);
  });
});

// ---- Freshness -----------------------------------------------------------------------------------------------

describe("a stale catalog", () => {
  it("shows the amber line once the source's stated next release has come, and not before", () => {
    const counts = { nextRelease: { date: "2027-02-12", what: "count" } };
    expect(catalogFreshness(counts, "2027-02-11")).toEqual({ stale: false });
    expect(catalogFreshness(counts, "2027-02-12")).toEqual({ stale: true, line: "A newer count may be out." });
    expect(catalogFreshness(counts, "2027-06-01")).toEqual({ stale: true, line: "A newer count may be out." });
  });

  it("never shows it for a source that states no date: DotAmi doesn't guess", () => {
    for (const c of SOURCES) expect(catalogFreshness(c, "2099-01-01"), c.id).toEqual({ stale: false });
  });

  it("says it in words that pass the verdict check", () => {
    expect(researchKitWords.newerMayBeOut("count")).toBe("A newer count may be out.");
    expect(findVerdicts(researchKitWords.newerMayBeOut("wage file"))).toEqual([]);
  });
});
