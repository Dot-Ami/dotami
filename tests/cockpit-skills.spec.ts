/**
 * The cockpit's skills, with the government's list for the person's pick of job
 * (docs/architecture/future-cockpit.md § 6, "Skills, and the government's list for your pick of job, as
 * built"): picked in the Skills list, shown there tagged "your pick of job" with marks, counted apart on
 * the Skills gauge, pointed to from the step panel, and never with a rating (names only while the
 * maintainer's item 20 is open). Components are drawn to HTML as in tests/cockpit-screen.spec.ts.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SkillsListPanel } from "@/components/cockpit/gauge-panels";
import { StepPanel } from "@/components/cockpit/step-panel";
import { cockpitWords } from "@/lib/cockpit/words";
import { gaugeView } from "@/lib/cockpit/view";
import { OASIS_ATTRIBUTION, oasisListForJob } from "@/lib/engines/oasis/v2026";
import { evaluateRoad, roadReceipt } from "@/lib/roads";

import { input, inventedIdea, roadToEvaluate, skillItems, TODAY } from "./helpers/road-to-evaluate";

/** As React writes text into HTML: ampersands and apostrophes escaped. */
const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

const cabinetmakers = oasisListForJob("72311.00")!;
const numeracy = cabinetmakers.items.find((i) => i.label === "Numeracy")!;
const mathematics = cabinetmakers.items.find((i) => i.label === "Mathematics")!;

/**
 * Anything that would show a government rating: its level words ("3 - Moderate Level", "2 - Intermediate
 * Level"), its scale ("on a scale of 1 - Lowest Level to 5 - Highest Level"), or "Not applicable".
 */
const RATING = /\b(Lowest|Low|Moderate|High|Highest|Basic|Intermediate|Advanced) Level\b|on a scale of|\bscale\b|Not applicable|\brating/i;

function drawList(change: Partial<Parameters<typeof SkillsListPanel>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(SkillsListPanel, {
      road: roadToEvaluate(),
      skillItems,
      marks: [{ id: "m1", skillItemId: numeracy.id, ownLabel: null, mark: "have", markedOn: TODAY }],
      selectedSkillId: null,
      canSave: true,
      error: null,
      job: cabinetmakers,
      jobPickedOn: TODAY,
      onMark: () => {},
      onSelectSkill: () => {},
      onPickJob: () => {},
      onClose: () => {},
      ...change,
    }),
  );
}

describe("the Skills list: your pick of job", () => {
  it("with no job picked: one optional question and a search box, nothing asked up front", () => {
    const html = drawList({ job: null, jobPickedOn: null });
    expect(html).toContain(esc(cockpitWords.lists.job.title));
    expect(html).toContain(esc(cockpitWords.lists.job.ask));
    expect(html).toContain(esc(cockpitWords.lists.job.optional));
    expect(html).toContain(`aria-label="${cockpitWords.lists.job.search}"`);
    // No row is drawn, so no row's tag (the optional line names the tag in its own words).
    expect(html).not.toContain(`>${cockpitWords.lists.job.tag}<`);
  });

  it("with a job picked: its name, code and day, Change and Take back, then every item tagged with its marks", () => {
    const html = drawList();
    expect(html).toContain("Cabinetmakers");
    expect(html).toContain("72311.00");
    expect(html).toContain(esc(cockpitWords.lists.job.change));
    expect(html).toContain(esc(cockpitWords.lists.job.takeBack));
    for (const item of cabinetmakers.items) expect(html).toContain(esc(item.label));
    // Every item says where it comes from: the tag on each row.
    expect((html.match(new RegExp(`>${cockpitWords.lists.job.tag}<`, "g")) ?? []).length).toBe(cabinetmakers.items.length);
    // The two groups, each with its source once, and the licence's own line with its link.
    expect(html).toContain(`>${cockpitWords.lists.job.groups.skills}<`);
    expect(html).toContain(`>${cockpitWords.lists.job.groups.knowledge}<`);
    expect(html).toContain(esc(OASIS_ATTRIBUTION));
    expect(html).toContain('href="https://open.canada.ca/en/open-government-licence-canada"');
    expect(html).toContain(esc(cockpitWords.lists.job.employees));
    // The person's mark on Numeracy shows as pressed.
    const row = html.slice(html.indexOf(">Numeracy<"));
    expect(row.slice(0, row.indexOf("</li>"))).toContain('aria-pressed="true"');
  });

  it("never shows a rating, a scale or 'Not applicable': names only", () => {
    expect(drawList()).not.toMatch(RATING);
    expect(drawList({ job: null, jobPickedOn: null })).not.toMatch(RATING);
  });

  it("puts no job in a link: the person's pick never travels in an address", () => {
    const hrefs = [...drawList().matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).not.toContain("72311");
  });
});

describe("the words for the job's list", () => {
  it("hold no rating words, and no claim about what a business needs", () => {
    const all = JSON.stringify(cockpitWords.lists.job) + JSON.stringify(cockpitWords.gauges.skills) + JSON.stringify(cockpitWords.panel);
    expect(all).not.toMatch(RATING);
    expect(cockpitWords.lists.job.employees).toContain("not owners");
  });
});

describe("the Skills gauge counts the job's list apart", () => {
  it("names the job's counts on their own line; the road's listed skills are unchanged", () => {
    const without = evaluateRoad(input());
    const withJob = evaluateRoad(
      input({
        job: cabinetmakers,
        skillMarks: [
          { skillItemId: numeracy.id, ownLabel: null, mark: "have" },
          { skillItemId: mathematics.id, ownLabel: null, mark: "learning" },
        ],
      }),
    );
    expect(withJob.gauges.skills.listed).toBe(without.gauges.skills.listed);
    expect(withJob.gauges.skills.yourPickOfJob).toEqual({
      code: "72311.00",
      label: "Cabinetmakers",
      listed: 44,
      have: 1,
      learning: 1,
      notYet: 0,
      notMarked: 42,
    });
    expect(without.gauges.skills.yourPickOfJob).toBeNull();
    const view = gaugeView(withJob, roadToEvaluate(), inventedIdea());
    expect(view.skills.lines).toContain(cockpitWords.gauges.skills.job(1, 1, 0, 44));
    // A step's "needs 3 · you have 2" counts only what the step itself lists.
    expect(withJob.steps.map((s) => s.needs)).toEqual(without.steps.map((s) => s.needs));
  });

  it("the pick and the marks on its items are answers the person gave, and a receipt names them", () => {
    const before = evaluateRoad(input());
    const picked = evaluateRoad(input({ job: cabinetmakers }));
    expect(picked.answers).toContainEqual(expect.objectContaining({ id: "job", group: "job", given: true }));
    expect(picked.answers.find((a) => a.id === "job")!.said).toContain("Cabinetmakers");
    expect(roadReceipt(before, picked).join(" ")).toContain("Cabinetmakers");

    const marked = evaluateRoad(input({ job: cabinetmakers, skillMarks: [{ skillItemId: numeracy.id, ownLabel: null, mark: "have" }] }));
    expect(marked.answers).toContainEqual(expect.objectContaining({ id: `skill:${numeracy.id}`, given: true }));
    const receipt = roadReceipt(picked, marked).join(" ");
    expect(receipt).toContain("Numeracy");
    expect(receipt).toContain("1 have");
  });

  it("a mark on the job's list counts nowhere once the pick is taken back", () => {
    const result = evaluateRoad(input({ job: null, skillMarks: [{ skillItemId: numeracy.id, ownLabel: null, mark: "have" }] }));
    expect(result.gauges.skills.yourPickOfJob).toBeNull();
    expect(result.answers.some((a) => a.id === `skill:${numeracy.id}`)).toBe(false);
  });
});

describe("the step panel points to the job's list without tying it to the step", () => {
  const road = roadToEvaluate();
  const draw = (job: { label: string; listed: number; marked: number } | null) => {
    const result = evaluateRoad(input());
    const step = road.steps[0]!;
    return renderToStaticMarkup(
      createElement(StepPanel, {
        road,
        step,
        evaluation: result.steps.find((s) => s.stepId === step.id)!,
        rules: result.rules,
        skillItems,
        marks: new Map(),
        selectedSkillId: null,
        branch: null,
        canSave: true,
        error: null,
        job,
        onStatus: () => {},
        onTicks: () => {},
        onMark: () => {},
        onSelectSkill: () => {},
        onOpenJobList: () => {},
        onProposeQuote: async () => null,
        province: "AB",
        ownNumber: null,
        onOwnNumberChange: () => {},
        onClose: () => {},
      }),
    );
  };

  it("with a job picked: one line with its counts and a button that opens the list", () => {
    const html = draw({ label: "Cabinetmakers", listed: 44, marked: 2 });
    expect(html).toContain(esc(cockpitWords.panel.jobLine("Cabinetmakers", 44, 2)));
    expect(html).toContain(`>${cockpitWords.panel.openJobList}<`);
    expect(html).not.toMatch(RATING);
  });

  it("with none picked: the invitation to pick one, and the same button", () => {
    const html = draw(null);
    expect(html).toContain(esc(cockpitWords.panel.noJob));
    expect(html).toContain(`>${cockpitWords.panel.pickJob}<`);
  });
});
