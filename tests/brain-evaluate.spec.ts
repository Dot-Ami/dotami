import { describe, expect, it } from "vitest";

import { evaluateProfile, buildEvaluationProfile } from "@/lib/brain";
import type { EvaluationProfile } from "@/lib/brain";
import { defaultIntakeDraft } from "@/lib/journey/types";

const TODAY = "2026-07-02";

/**
 * Canonical golden scenario (docs/brain/README.md): the previously hardcoded
 * GPU/workstation wireframe example, now generated. AB sole prop, AI/R&D + software
 * activity, capital equipment purchase planned.
 */
const gpuWorkstationProfile: EvaluationProfile = {
  goals: ["write-offs", "discover-now"],
  ventureType: "service",
  activityTags: ["AI / ML / R&D", "Software / SaaS"],
  province: "AB",
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 30000,
  targetRevenueY3: 90000,
  hireFirst: false,
  capitalPurchasePlanned: true,
};

describe("strategy rules engine — GPU/workstation golden scenario", () => {
  const result = evaluateProfile(gpuWorkstationProfile, { today: TODAY });
  const byId = new Map(result.unlocks.map((u) => [u.id, u]));

  it("flags SR&ED as yellow with the sole-prop rate and a CCPC fork", () => {
    const sred = byId.get("grant-sred");
    expect(sred).toBeDefined();
    expect(sred!.state).toBe("yellow");
    expect(sred!.typeChip).toBe("Tax credit");
    expect(sred!.payoff).toContain("15%");
    expect(sred!.payoff).toContain("non-refundable");
    expect(sred!.fork).toBeDefined();
    expect(sred!.fork!.note).toContain("35%");
    expect(sred!.fork!.note).toContain("refundable");
  });

  it("activates Class 50 with the Immediate Expensing incentive as yellow with expiry", () => {
    const class50 = byId.get("writeoff-cca-class-50");
    expect(class50).toBeDefined();
    expect(class50!.state).toBe("yellow");
    expect(class50!.expires).toBe("2027-01-01");
    expect(class50!.payoff).toContain("accountant");
  });

  it("surfaces IRAP as a gray→yellow incorporation fork (near-miss rule)", () => {
    const irap = byId.get("grant-irap");
    expect(irap).toBeDefined();
    expect(irap!.state).toBe("yellow");
    expect(irap!.fork).toBeDefined();
    expect(irap!.fork!.label).toContain("Incorporating");
  });

  it("flags Alberta Innovates for an AB tech venture", () => {
    const abi = byId.get("grant-alberta-innovates");
    expect(abi).toBeDefined();
    expect(abi!.typeChip).toBe("Grant");
  });

  it("surfaces the GST/HST card, quoting the CRA's tests", () => {
    const gst = byId.get("compliance-gst-small-supplier");
    expect(gst).toBeDefined();
    expect(gst!.typeChip).toBe("Threshold");
    // Y1 = $30,000 sits exactly on the line and the CRA's tests say "exceed", so neither is met: no
    // amber of DotAmi's own (until 2026-10-11 a 70% "approaching" band turned it amber here).
    expect(gst!.state).toBe("green");
    expect(gst!.officialWords?.passages).toHaveLength(2);
  });

  it("surfaces CSBFP as financing (never labeled a grant)", () => {
    const csbfp = byId.get("grant-csbfp");
    expect(csbfp).toBeDefined();
    expect(csbfp!.typeChip).toBe("Financing");
  });

  it("attaches the honest risk read: Class 50 IEI and SR&ED are professional-required", () => {
    const class50 = byId.get("writeoff-cca-class-50");
    expect(class50!.risk).toBeDefined();
    expect(class50!.risk!.level).toBe("professional-required");
    const sred = byId.get("grant-sred");
    expect(sred!.risk).toBeDefined();
    expect(sred!.risk!.level).toBe("professional-required");
    expect(sred!.risk!.mitigation.length).toBeGreaterThan(0);
  });

  it("risk informs but never censors: risky levers still surface", () => {
    const homeOffice = byId.get("writeoff-home-office");
    expect(homeOffice).toBeDefined();
    expect(homeOffice!.risk!.level).toBe("caution");
    expect(homeOffice!.state).not.toBe("gray");
  });

  it("professional-required risk downgrades green to yellow (never green)", () => {
    for (const unlock of result.unlocks) {
      if (unlock.risk?.level === "professional-required") {
        expect(unlock.state).not.toBe("green");
      }
    }
  });

  it("never emits 'you qualify' language (compass, not GPS)", () => {
    for (const unlock of result.unlocks) {
      expect(unlock.payoff.toLowerCase()).not.toContain("you qualify");
      expect(unlock.why.toLowerCase()).not.toContain("you qualify");
    }
  });

  it("colors nodes: baseline green, GST fork visible, SR&ED incorporation path yellow", () => {
    expect(result.nodeStates["stage-0-employee-apprentice-baseline"]).toBe("green");
    expect(result.nodeStates["stage-1-sole-prop-activation"]).toBe("green");
    // $30,000 Y1 sits exactly ON the line — the CRA's tests say exceed, not reach — so the picked
    // (mandatory) card is "check first", not a false-green "registered" claim (audit H3), and the
    // voluntary card nobody picked stays grey: no test is met (2026-10-11, no 70% band).
    expect(result.nodeStates["stage-2b-mandatory-gst-registration"]).toBe("yellow");
    expect(result.nodeStates["stage-2a-voluntary-gst-registration"]).toBe("gray");
    // R&D tags make the liability/SR&ED incorporation branch worth modeling
    expect(result.nodeStates["stage-3b-incorporation-liability-sred"]).toBe("yellow");
    expect(result.nodeStates["branch-hire-first-employee"]).toBe("gray");
  });
});

describe("strategy rules engine — determinism and time-boxing", () => {
  it("same input → same output", () => {
    const a = evaluateProfile(gpuWorkstationProfile, { today: TODAY });
    const b = evaluateProfile(gpuWorkstationProfile, { today: TODAY });
    expect(a).toEqual(b);
  });

  it("lapsed incentive stops surfacing as enhanced (post-2027 clock)", () => {
    const after = evaluateProfile(gpuWorkstationProfile, { today: "2027-06-01" });
    const class50 = after.unlocks.find((u) => u.id === "writeoff-cca-class-50");
    expect(class50).toBeDefined();
    expect(class50!.expires).toBeUndefined();
    expect(class50!.payoff).not.toContain("100%");
    // Still yellow: the professional-required CCA risk read survives the incentive lapse.
    expect(class50!.state).toBe("yellow");
    expect(class50!.risk?.level).toBe("professional-required");
  });
});

describe("strategy rules engine — gating correctness", () => {
  it("does not surface AB-only programs for Ontario profiles", () => {
    const onProfile: EvaluationProfile = { ...gpuWorkstationProfile, province: "ON" };
    const result = evaluateProfile(onProfile, { today: TODAY });
    const ids = result.unlocks.map((u) => u.id);
    expect(ids).not.toContain("grant-alberta-innovates");
    expect(ids).not.toContain("grant-cajg");
    expect(ids).toContain("grant-on-innovation");
  });

  it("drops the SR&ED fork once the profile is already a CCPC", () => {
    const ccpcProfile: EvaluationProfile = { ...gpuWorkstationProfile, structure: "ccpc" };
    const result = evaluateProfile(ccpcProfile, { today: TODAY });
    const sred = result.unlocks.find((u) => u.id === "grant-sred");
    expect(sred).toBeDefined();
    expect(sred!.payoff).toContain("35%");
    expect(sred!.fork).toBeUndefined();
  });

  it("below-threshold revenue keeps GST as a green checkpoint, not a warning", () => {
    const lowRevenue: EvaluationProfile = { ...gpuWorkstationProfile, targetRevenueY1: 10000 };
    const result = evaluateProfile(lowRevenue, { today: TODAY });
    const gst = result.unlocks.find((u) => u.id === "compliance-gst-small-supplier");
    expect(gst).toBeDefined();
    expect(gst!.state).toBe("green");
  });
});

// #36: a compliance card's "why" line credited the province on every rule, so an Alberta venture read
// "Shown because you selected Alberta." on the GST/HST small-supplier rule, which is federal. A rule
// whose `provinces` include "CA" (federal entries list the provinces too, so the test is whether "CA"
// is there, not whether it is alone) now says it is shown because it is federal.
describe("why a compliance card is shown: federal or the province (#36)", () => {
  const FEDERAL = "Shown because it is a federal rule, the same in every province and territory.";
  const unlock = (profile: EvaluationProfile, id: string) =>
    evaluateProfile(profile, { today: TODAY }).unlocks.find((u) => u.id === id);

  it("a federal rule says it is federal, not that you selected Alberta", () => {
    const gst = unlock({ ...gpuWorkstationProfile, targetRevenueY1: 10000 }, "compliance-gst-small-supplier");
    expect(gst).toBeDefined();
    expect(gst!.why).toBe(FEDERAL);
    expect(gst!.why).not.toContain("Alberta");
  });

  it("says the same with no province chosen yet, where it used to say \"because you selected your province\"", () => {
    const gst = unlock({ ...gpuWorkstationProfile, province: null, targetRevenueY1: 10000 }, "compliance-gst-small-supplier");
    expect(gst!.why).toBe(FEDERAL);
  });

  it("a federal rule for a kind of work that doesn't name its tag says it is federal too", () => {
    const hobby = unlock({ ...gpuWorkstationProfile, activityTags: ["Content / streaming"] }, "compliance-hobby-vs-business");
    expect(hobby).toBeDefined();
    expect(hobby!.why).toBe(FEDERAL);
  });

  it("a provincial rule still names the province", () => {
    expect(unlock(gpuWorkstationProfile, "compliance-ab-no-pst")!.why).toBe("Shown because you selected Alberta.");
    expect(unlock({ ...gpuWorkstationProfile, province: "BC" }, "compliance-bc-pst")!.why).toBe("Shown because you selected British Columbia.");
  });

  it("a rule over the line still says so in place of either", () => {
    const gst = unlock({ ...gpuWorkstationProfile, targetRevenueY1: 45000 }, "compliance-gst-small-supplier");
    expect(gst!.why).toBe("Shown because your Y1 revenue target ($45,000) is over $30,000, the amount in the CRA's tests.");
  });

  // The ride-share cards (#147) name the tag that lit them; both rules are federal, so neither adds
  // the province. Pinned here because the federal test above decides this line too.
  it("a federal rule that names its tag names only the tag", () => {
    const driver = { ...gpuWorkstationProfile, activityTags: ["Ride-share or taxi driving"], province: "ON" as const, targetRevenueY1: 10000 };
    for (const id of ["compliance-platform-reporting-rideshare", "compliance-gst-taxi-ride-sharing"]) {
      expect(unlock(driver, id)?.why, id).toBe("Shown because your intake has the activity tag Ride-share or taxi driving.");
    }
  });
});

// The grant cards had the same fault as #36: an eligible program's line read "Shown because Alberta and
// your ... activity match this program." on SR&ED, IRAP and the CSBFP, which are federal. A program whose
// `provinces` include "CA" is shown in any province (`provinceMatches`), so its line now says it is
// federal and offered everywhere; it is a program, not a rule, and the activity still decides it.
describe("why a grant card is shown: federal or the province", () => {
  const unlock = (profile: EvaluationProfile, id: string) =>
    evaluateProfile(profile, { today: TODAY }).unlocks.find((u) => u.id === id);
  const federal = (tags: string) =>
    `Shown because it is a federal program, offered in every province and territory, and your ${tags} activity matches it.`;

  it("a federal program says it is federal, not that Alberta matched it", () => {
    for (const id of ["grant-sred", "grant-csbfp"]) {
      const card = unlock(gpuWorkstationProfile, id);
      expect(card, id).toBeDefined();
      expect(card!.why, id).toBe(federal("Software / SaaS and AI / ML / R&D"));
      expect(card!.why, id).not.toContain("Alberta");
    }
  });

  it("says the same with no province chosen yet, where it used to say \"because your province and ...\"", () => {
    const sred = unlock({ ...gpuWorkstationProfile, province: null }, "grant-sred");
    expect(sred!.why).toBe(federal("Software / SaaS and AI / ML / R&D"));
  });

  it("an eligible federal grant (IRAP, for a corporation) says it too", () => {
    const irap = unlock({ ...gpuWorkstationProfile, structure: "ccpc", province: "ON" }, "grant-irap");
    expect(irap!.why).toBe(federal("Software / SaaS and AI / ML / R&D"));
  });

  it("a provincial program still names the province", () => {
    expect(unlock(gpuWorkstationProfile, "grant-alberta-innovates")!.why).toBe(
      "Shown because Alberta and your Software / SaaS and AI / ML / R&D activity match this program.",
    );
  });

  it("a program that needs a corporation keeps its own line", () => {
    expect(unlock(gpuWorkstationProfile, "grant-irap")!.why).toBe(
      "Shown because your activity matches, but this program requires incorporation (CCPC).",
    );
  });
});

describe("strategy rules engine — profile and intake coverage", () => {
  it("blank default draft yields an honestly empty preview (no fake fullness)", () => {
    const profile = buildEvaluationProfile(defaultIntakeDraft());
    const result = evaluateProfile(profile, { today: TODAY });
    // No goals picked, no tags, no province → no goal cards, no venture/location claims.
    expect(result.unlocks.filter((u) => u.step === "goals")).toHaveLength(0);
    expect(result.unlocks.filter((u) => u.step === "venture")).toHaveLength(0);
    expect(result.unlocks.filter((u) => u.step === "refine")).toHaveLength(0);
    expect(result.unlocks.some((u) => u.id === "refine-projection")).toBe(false);
    expect(result.provinceCoverage).toBe("unknown");
    expect(profile.employmentStatus).toBeNull();
  });

  it("a filled draft produces unlocks in every step group", () => {
    const draft = {
      ...defaultIntakeDraft(),
      goals: ["write-offs" as const],
      activityTags: ["Software / SaaS"],
      province: "AB" as const,
      targetRevenueY1: 40000,
    };
    const result = evaluateProfile(buildEvaluationProfile(draft), { today: TODAY });
    const steps = new Set(result.unlocks.map((u) => u.step));
    expect(steps.has("goals")).toBe(true);
    expect(steps.has("venture")).toBe(true);
    expect(steps.has("location")).toBe(true);
    expect(result.provinceCoverage).toBe("full");
  });

  it("federal-only province surfaces CA-wide entries with honest coverage", () => {
    const mbProfile: EvaluationProfile = { ...gpuWorkstationProfile, province: "MB" };
    const result = evaluateProfile(mbProfile, { today: TODAY });
    expect(result.provinceCoverage).toBe("federal-only");
    const ids = result.unlocks.map((u) => u.id);
    // Federal programs still surface…
    expect(ids).toContain("grant-sred");
    expect(ids).toContain("writeoff-cca-class-50");
    // …provincial-only programs never leak in.
    expect(ids).not.toContain("grant-alberta-innovates");
    expect(ids).not.toContain("grant-on-innovation");
    expect(ids).not.toContain("compliance-bc-pst");
  });

  it("representative profiles evaluate without error and yield unlocks (S2.5.4h: no archetypes)", () => {
    const profiles: EvaluationProfile[] = [
      // A sole-prop apprentice profile with trades + software tags.
      {
        goals: ["discover-now"],
        ventureType: "service",
        activityTags: ["Trades", "Software / SaaS"],
        province: "AB",
        employmentStatus: "apprentice",
        structure: "sole-prop",
        targetRevenueY1: 40_000,
        targetRevenueY3: 120_000,
        hireFirst: false,
        capitalPurchasePlanned: true,
      },
      {
        goals: ["scale-ccpc"],
        ventureType: "product",
        activityTags: ["Software / SaaS", "AI / ML / R&D"],
        province: "BC",
        employmentStatus: "employee",
        structure: "ccpc",
        targetRevenueY1: 75_000,
        targetRevenueY3: 220_000,
        hireFirst: false,
        capitalPurchasePlanned: false,
      },
      {
        goals: ["replace-income"],
        ventureType: "service",
        activityTags: ["Consulting"],
        province: "ON",
        employmentStatus: "self-employed",
        structure: "sole-prop-gst",
        targetRevenueY1: 90_000,
        targetRevenueY3: 150_000,
        hireFirst: true,
        capitalPurchasePlanned: false,
      },
    ];
    for (const profile of profiles) {
      const result = evaluateProfile(profile, { today: TODAY });
      expect(result.unlocks.length).toBeGreaterThan(0);
    }
  });
});
