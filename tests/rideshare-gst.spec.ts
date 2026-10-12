/**
 * Ride-share and taxi drivers register for GST/HST from the first paid ride: the $30,000 small-supplier
 * line doesn't apply to them (docs/engines/compliance.md § Work the $30,000 line doesn't cover).
 *
 * Until 2026-10-11 DotAmi had no driver kind of work and only the general $30,000 rule, so the CRA's
 * own example driver, Abby, who earns $10,000 driving passengers in Ontario, was shown a green GST/HST
 * card saying most businesses "need not register yet", and her sentence was tagged Software / SaaS
 * because it says "platform".
 *
 * The example wording below is the CRA's own, read on its pages on 2026-10-11.
 */
import { describe, expect, it } from "vitest";

import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { itemsForNode } from "@/lib/brain/node-items";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { complianceCatalogV2026 } from "@/lib/engines/compliance/v2026";
import { ACTIVITY_TAXONOMY } from "@/lib/journey/intent";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";

const TODAY = "2026-10-11";
const READ_ON = "2026-10-11";
const TAG = "Ride-share or taxi driving";
const RULE = "compliance-gst-taxi-ride-sharing";
const PLATFORM_RULE = "compliance-platform-reporting-rideshare";
const SMALL_SUPPLIER = "compliance-gst-small-supplier";
const VOLUNTARY = "stage-2a-voluntary-gst-registration" satisfies CFENodeId;
const MANDATORY = "stage-2b-mandatory-gst-registration" satisfies CFENodeId;

const SHARING_PAGE =
  "https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/platform-economy/sharing-economy.html";
const TAXI_PAGE =
  "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-specific-situations/taxi-ride-sharing-drivers.html";
const GI_196 =
  "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/gi-196/gst-hst-commercial-ride-sharing-services.html";
const ETA_240 = "https://laws-lois.justice.gc.ca/eng/acts/E-15/section-240.html";
const PLATFORM_PAGE =
  "https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/reporting-rules-digital-platforms.html";

// The CRA's sharing-economy page, section "Commercial ridesharing".
const MUST_REGISTER =
  "You must register for a GST/HST account the moment you start earning money from commercial ridesharing services.";
const LINE_DOES_NOT_APPLY = "The $30,000 small supplier threshold does not apply for commercial ridesharing services.";
// The same page's worked example, and the line of it about food delivery.
const ABBY =
  "Abby is registered for GST/HST as a commercial ridesharing driver operating in Ontario using the Uber platform.";
const ABBY_DELIVERY = "Abby also earns $10,000 for delivery services through Uber Eats.";
// The CRA's taxi and ride-sharing page, from its examples of GST/HST included in a fare.
const MANITOBA_TAXI = "A Manitoba taxi driver charging a $35 fare";

const abby: EvaluationProfile = {
  goals: [],
  ventureType: "service",
  activityTags: [TAG],
  province: "ON",
  employmentStatus: "self-employed",
  structure: "sole-prop",
  // "Since Abby earns $10,000 from driving passengers, …"
  targetRevenueY1: 10_000,
  targetRevenueY3: 10_000,
  hireFirst: false,
  capitalPurchasePlanned: false,
};

const rule = () => complianceCatalogV2026.entries.find((e) => e.id === RULE);
const card = (result: ReturnType<typeof evaluateProfile>, id: string) => result.unlocks.find((u) => u.id === id);

describe("a ride-share or taxi kind of work", () => {
  it("is in the taxonomy the intake and the parsers use", () => {
    expect(ACTIVITY_TAXONOMY as readonly string[]).toContain(TAG);
  });

  it("the CRA's example driver, Abby, is read as ride-share driving in Ontario", () => {
    const r = parseIntentFallback(ABBY);
    expect(r.activityTags).toContain(TAG);
    expect(r.province).toBe("ON");
  });

  it("the CRA's Manitoba taxi driver is read as taxi driving in Manitoba", () => {
    const r = parseIntentFallback(MANITOBA_TAXI);
    expect(r.activityTags).toContain(TAG);
    expect(r.province).toBe("MB");
  });

  it("Uber Eats food delivery is not ride-share driving: the CRA counts it separately", () => {
    expect(parseIntentFallback(ABBY_DELIVERY).activityTags).not.toContain(TAG);
  });

  it("other ways people say it are read too, and look-alike words aren't", () => {
    for (const text of ["I drive for Lyft in Calgary", "Driving for Uber on weekends", "I'm a cab driver", "rideshare driver"]) {
      expect(parseIntentFallback(text).activityTags, text).toContain(TAG);
    }
    for (const text of ["A taxidermy studio", "Uber Eats deliveries on my bike", "Taxing work, honestly"]) {
      expect(parseIntentFallback(text).activityTags, text).not.toContain(TAG);
    }
  });

  // A food courier who says "drive" is still a food courier: the CRA's example counts Abby's Uber Eats
  // delivery toward the general $30,000 total, so the ride-share rule must not be suggested for it.
  it("driving for Uber Eats is food delivery, not ride-share driving", () => {
    for (const text of [
      "I drive for Uber Eats",
      "Driving for Uber Eats on weekends in Calgary",
      "I deliver groceries with Instacart and drive Uber Eats",
      "ride share delivery with Uber Eats",
    ]) {
      expect(parseIntentFallback(text).activityTags, text).not.toContain(TAG);
    }
    // Someone who does both still gets the tag, from the part about driving passengers.
    expect(parseIntentFallback("I drive for Uber and Uber Eats").activityTags).toContain(TAG);
  });

  // The CRA's rule is about the self-employed drivers who give the rides, not the people writing the app.
  it("building a rideshare app is not driving for one", () => {
    for (const text of ["I'm building a rideshare app for university students", "Starting a ride-sharing software platform startup"]) {
      expect(parseIntentFallback(text).activityTags, text).not.toContain(TAG);
    }
    for (const text of ["I drive rideshare on weekends", "I'm a ride-share driver in Edmonton", "driving for a rideshare company"]) {
      expect(parseIntentFallback(text).activityTags, text).toContain(TAG);
    }
  });
});

describe("the rule: GST/HST from the first paid ride, cited", () => {
  it("is scoped to the kind of work, everywhere in Canada, with no amount of its own", () => {
    const r = rule();
    expect(r).toBeDefined();
    expect(r!.industryTags).toEqual([TAG]);
    expect(r!.provinces).toContain("CA");
    expect(r!.thresholdAmount).toBeUndefined();
  });

  it("quotes the CRA's sharing-economy page word for word, from a citation read on the day", () => {
    const r = rule()!;
    expect(r.officialWords?.url).toBe(SHARING_PAGE);
    const sentences = r.officialWords!.passages.flatMap((p) => p.sentences);
    expect(sentences).toContain(MUST_REGISTER);
    expect(sentences).toContain(LINE_DOES_NOT_APPLY);
    expect(r.citations.find((c) => c.url === SHARING_PAGE)?.lastVerified).toBe(READ_ON);
  });

  it("cites the CRA's taxi and ride-sharing page, GI-196 and the Act, each read on the day", () => {
    const r = rule()!;
    for (const url of [TAXI_PAGE, GI_196, ETA_240]) {
      const citation = r.citations.find((c) => c.url === url);
      expect(citation, url).toBeDefined();
      expect(citation!.lastVerified, url).toBe(READ_ON);
    }
    // GI-196's own words on when registration takes effect, kept with its citation.
    expect(r.citations.find((c) => c.url === GI_196)!.note).toContain(
      "the effective date of registration will be the particular day on which the self-employed commercial ride-sharing driver starts to make taxable supplies",
    );
    expect(r.citations.find((c) => c.url === ETA_240)!.title).toMatch(/Excise Tax Act/);
  });

  it("names the small-supplier rule it sets aside, in typed data", () => {
    const aside = rule()!.setsAsideThreshold;
    expect(aside?.ruleId).toBe(SMALL_SUPPLIER);
    expect(aside?.why.length).toBeGreaterThan(0);
    expect(aside?.stillDecides.length).toBeGreaterThan(0);
  });

  // The two sentences name the line in words; if the small-supplier rule's amount ever changes, this
  // fails until they are rewritten to match, so they can't go stale quietly.
  it("names the same amount as the small-supplier rule it sets aside", () => {
    const line = complianceCatalogV2026.entries.find((e) => e.id === SMALL_SUPPLIER)!.thresholdAmount!;
    const amount = `$${line.toLocaleString("en-CA")}`;
    const aside = rule()!.setsAsideThreshold!;
    expect(aside.why).toContain(amount);
    expect(aside.stillDecides).toContain(amount);
  });

  // GI-196: "before the thirtieth day after that particular day" (first ride September 1, apply by
  // September 30). "Until the thirtieth day" would run a day past that.
  it("gives GI-196's deadline as GI-196 words it", () => {
    expect(rule()!.description).toContain("before the thirtieth day after");
    expect(rule()!.description).not.toMatch(/until the thirtieth day/);
  });
});

describe("Abby on the map: $10,000 from driving passengers in Ontario", () => {
  const result = evaluateProfile(abby, { today: TODAY });

  it("shows the ride-share and taxi card, green, with the CRA's words", () => {
    const c = card(result, RULE);
    expect(c).toBeDefined();
    expect(c!.state).toBe("green");
    expect(c!.why).toContain(TAG);
    expect(c!.officialWords).toEqual(rule()!.officialWords);
  });

  it("the small-supplier card is no longer green and no longer says she need not register yet", () => {
    const c = card(result, SMALL_SUPPLIER)!;
    expect(c.state).toBe("yellow");
    expect(`${c.why} ${c.payoff}`).not.toMatch(/need not register yet/i);
    expect(c.why).toContain(rule()!.setsAsideThreshold!.why);
    expect(c.payoff).toBe(rule()!.setsAsideThreshold!.stillDecides);
    // The two tests stay quoted: the line still counts for her other sales.
    expect(c.officialWords?.passages).toHaveLength(2);
  });

  it("Mandatory GST registration applies, saying which answer lit it, whichever GST timing is picked", () => {
    for (const gstTiming of [MANDATORY, VOLUNTARY]) {
      const r = evaluateProfile(abby, {
        today: TODAY,
        activeBranches: { gstTiming, incorporationTiming: "stage-3a-incorporation-80k-net" },
      });
      expect(r.nodeStates[MANDATORY], gstTiming).toBe("green");
      expect(r.nodeStates[VOLUNTARY], gstTiming).toBe("yellow");
      expect(r.nodeReasons[MANDATORY], gstTiming).toContain(TAG);
      expect(r.nodeReasons[VOLUNTARY], gstTiming).toBe(rule()!.setsAsideThreshold!.stillDecides);
    }
  });

  it("the card sits on the Mandatory GST registration stage", () => {
    expect(itemsForNode(result.unlocks, MANDATORY).forThisStage.map((u) => u.id)).toContain(RULE);
  });

  it("over $30,000 the small-supplier card still says so, and still names the set-aside", () => {
    const r = evaluateProfile({ ...abby, targetRevenueY1: 30_001 }, { today: TODAY });
    const c = card(r, SMALL_SUPPLIER)!;
    expect(c.state).toBe("yellow");
    expect(c.why).toContain("over $30,000");
    expect(c.why).toContain(rule()!.setsAsideThreshold!.why);
    expect(card(r, RULE)!.state).toBe("green");
  });

  it("a taxi driver in Manitoba, outside the provinces mapped in full, sees the federal rule", () => {
    const r = evaluateProfile({ ...abby, province: "MB" }, { today: TODAY });
    expect(card(r, RULE)?.state).toBe("green");
    expect(r.nodeStates[MANDATORY]).toBe("green");
  });
});

describe("the control: the same $10,000 without the driving tag is unchanged", () => {
  const result = evaluateProfile({ ...abby, activityTags: ["Consulting"] }, { today: TODAY });

  it("keeps the small-supplier card green with its 'need not register yet' line", () => {
    const c = card(result, SMALL_SUPPLIER)!;
    expect(c.state).toBe("green");
    expect(c.payoff).toMatch(/need not register yet/);
    expect(c.why).toBe("Shown because you selected Ontario.");
  });

  it("shows neither driver card, and the GST/HST stages keep their old colours and no reasons", () => {
    expect(card(result, RULE)).toBeUndefined();
    expect(card(result, PLATFORM_RULE)).toBeUndefined();
    expect(result.nodeStates[MANDATORY]).toBe("yellow");
    expect(result.nodeStates[VOLUNTARY]).toBe("gray");
    expect(result.nodeReasons[MANDATORY]).toBeUndefined();
    expect(result.nodeReasons[VOLUNTARY]).toBeUndefined();
  });

  // The other cards scoped to a kind of work keep the reason line they had before this change. Naming
  // the tag on them too is a separate question for the maintainer, not part of the ride-share rule.
  it("the other cards for a kind of work keep their reason lines", () => {
    const cases: Array<[string, Partial<EvaluationProfile>, string]> = [
      ["compliance-trades-licensing-ab", { activityTags: ["Trades"], province: "AB" }, "Shown because you selected Alberta."],
      ["compliance-hobby-vs-business", { activityTags: ["Content / streaming"], province: "AB" }, "Shown because you selected Alberta."],
      ["compliance-food-premises-on", { activityTags: ["Food service"], province: "ON" }, "Shown because you selected Ontario."],
    ];
    for (const [id, over, why] of cases) {
      const c = card(evaluateProfile({ ...abby, ...over }, { today: TODAY }), id);
      expect(c, id).toBeDefined();
      expect(c!.why, id).toBe(why);
    }
  });
});

describe("platforms may report drivers' information to the CRA", () => {
  const platform = () => complianceCatalogV2026.entries.find((e) => e.id === PLATFORM_RULE);

  it("is a cited card for the same kind of work, quoting the CRA's page on the reporting rules", () => {
    const p = platform();
    expect(p).toBeDefined();
    expect(p!.industryTags).toEqual([TAG]);
    expect(p!.officialWords?.url).toBe(PLATFORM_PAGE);
    const sentences = p!.officialWords!.passages.flatMap((x) => x.sentences);
    expect(sentences).toContain("These platform operators have to collect detailed information on certain sellers.");
    expect(sentences).toContain("This information needs to be verified and reported to the Canada Revenue Agency (CRA) annually.");
    expect(sentences).toContain("Rideshare and delivery services");
    expect(p!.citations.find((c) => c.url === PLATFORM_PAGE)?.lastVerified).toBe(READ_ON);
  });

  it("shows on Abby's map, and says information, as the page does, not earnings", () => {
    const c = card(evaluateProfile(abby, { today: TODAY }), PLATFORM_RULE);
    expect(c).toBeDefined();
    expect(`${c!.title} ${c!.why} ${c!.payoff}`).not.toMatch(/earning/i);
  });

  // The page says sellers who are reported "may include" rideshare drivers, and that operators collect
  // information on "certain sellers": the card's title and description don't say more than that.
  it("hedges as the page does: platforms may report, on certain sellers", () => {
    const c = card(evaluateProfile(abby, { today: TODAY }), PLATFORM_RULE)!;
    expect(c.title).toMatch(/\bmay report\b/);
    expect(platform()!.description).toContain("certain sellers");
  });
});
