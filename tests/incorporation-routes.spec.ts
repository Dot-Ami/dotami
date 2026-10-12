/**
 * Federal and Alberta incorporation, side by side, each from its own official page
 * (docs/architecture/future-cockpit.md § 9, fix 2). Showing only one route would choose it for the
 * person; a fee shown is one its own page states, and a fee DotAmi couldn't read is a named blank.
 */
import { describe, expect, it } from "vitest";

import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { incorporationRoutesFor, incorporationRoutesV2026 } from "@/lib/engines/cfe/v2026/incorporation-routes";

const MANDATORY = "stage-2b-mandatory-gst-registration" satisfies CFENodeId;
const INCORPORATING = "stage-3a-incorporation-80k-net" satisfies CFENodeId;

describe("federal and Alberta incorporation, side by side, from their own pages", () => {
  it("an Alberta idea sees both routes; neither is picked for the person", () => {
    const { routes, provinceNotWritten } = incorporationRoutesFor(INCORPORATING, "AB");
    expect(routes.map((r) => r.id)).toEqual(["incorporation-route-federal", "incorporation-route-alberta"]);
    expect(provinceNotWritten).toBeNull();
  });

  it("an idea in a province with no written route sees the federal route and is told the other isn't written", () => {
    const { routes, provinceNotWritten } = incorporationRoutesFor(INCORPORATING, "BC");
    expect(routes.map((r) => r.id)).toEqual(["incorporation-route-federal"]);
    expect(provinceNotWritten).toBe("BC");
  });

  it("other stages have no routes", () => {
    expect(incorporationRoutesFor(MANDATORY, "AB").routes).toEqual([]);
  });

  it("every fee shown is an amount its own page states, inside the quoted words; a blank never has an amount", () => {
    const ids = new Set<string>();
    for (const route of incorporationRoutesV2026) {
      for (const line of route.lines) {
        expect(ids.has(line.id), line.id).toBe(false);
        ids.add(line.id);
        expect(line.citation.url, line.id).toMatch(/^https:\/\//);
        expect(line.citation.lastVerified, line.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(line.quotes.length, line.id).toBeGreaterThan(0);
        if (line.kind === "official-fee") {
          const written = `$${line.amountCad!.toLocaleString("en-CA")}`;
          expect(line.quotes.join(" "), `${line.id}: ${written} is not in its quote`).toContain(written);
        } else {
          expect(line.amountCad, line.id).toBeUndefined();
        }
      }
    }
  });

  it("the federal route shows the online fees read on Corporations Canada's page", () => {
    const federal = incorporationRoutesV2026.find((r) => r.id === "incorporation-route-federal")!;
    const fee = (id: string) => federal.lines.find((l) => l.id === id)!;
    expect(fee("federal-incorporation-fee")).toMatchObject({ kind: "official-fee", amountCad: 200, per: "once" });
    expect(fee("federal-annual-return-fee")).toMatchObject({ kind: "official-fee", amountCad: 12, per: "year" });
    expect(fee("federal-incorporation-fee").citation.url).toBe(
      "https://ised-isde.canada.ca/site/corporations-canada/en/services-fees-and-processing-times",
    );
  });

  it("Alberta's registry fees are named blanks, never guessed", () => {
    const alberta = incorporationRoutesV2026.find((r) => r.id === "incorporation-route-alberta")!;
    expect(alberta.lines.length).toBeGreaterThan(0);
    for (const line of alberta.lines) expect(line.kind, line.id).not.toBe("official-fee");
  });
});
