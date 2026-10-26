/**
 * The cockpit screen, part 1 (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built"), in a
 * real browser against the production build: open a saved idea, read the gauges, switch the overlays,
 * open a step and work on it, mark a skill, give a number through the agree prompt, and see it all
 * kept after a reload.
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { generalRoadV2026, roadsV2026 } from "../lib/engines/roads/v2026";

import { lookCloser as openFromLookCloser, lookCloserItems } from "./cockpit-calm";

// Road 0 (today's general road) counted from its own data: its ten map stages, the three "before you
// open" steps added on 2026-10-12 and Keep your records from day one (2026-10-14), so the Steps gauge
// reads "0 of 14".
const road0Steps = generalRoadV2026.steps.length;
const soleProp = generalRoadV2026.steps.find((s) => s.id === "stage-1-sole-prop-activation")!;

/** The run's own data file, for the one test that draws an idea on another road. */
async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").split(path.sep).join("/");
  const db = createDatabaseClient({ url: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

/** An invented Alberta idea, saved the way the intake saves one; returns its id. */
async function saveIdea(page: Page, name: string): Promise<string> {
  const scenario = {
    id: `cockpit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile: {
      name,
      type: "service",
      province: "AB",
      targetRevenueY1: 20_000,
      targetRevenueY3: 60_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "employee",
      hireFirst: false,
      activityTags: ["Software / SaaS"],
      stage: "idea",
    },
    state: {
      activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  return ((await saved.json()) as { ventureId: string }).ventureId;
}

const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const gauge = (page: Page, name: string) => goalBar(page).getByRole("button", { name: new RegExp(`^${name}`) });
const overlays = (page: Page) => page.getByRole("group", { name: "Overlays" });
const stage = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name}, `) });
const stepPanel = (page: Page) => page.getByRole("region", { name: "Step" });

test("the cockpit: gauges, overlays, a step's status, your own skill, your savings and your date, kept after a reload", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — cockpit test");
  await page.goto(`/cockpit?venture=${ventureId}`);

  // The goal bar: the road by name and four gauges, counts only. This idea is saved with no road picked, so the
  // line says it is drawn on the general road and why (task 28c).
  await expect(
    goalBar(page).getByText("Map drawn: Starting any business in Alberta (tax and structure) · the general road, because this idea was saved before a road was picked for it"),
  ).toBeVisible();
  await expect(gauge(page, "Steps")).toContainText(`0 of ${road0Steps} marked done`);
  // Road 0's one legal requirement (the GST/HST registration, from the compliance catalog), not marked yet.
  await expect(gauge(page, "Skills")).toContainText("1 not marked, out of 1 listed");
  // The before-you-open steps name four lines the person prices, and Sole Prop activation seven
  // start-up lines (2026-10-12), all with no amount, so never $0.
  await expect(gauge(page, "Start-up money")).toContainText("your numbers: not given yet");
  await expect(gauge(page, "Start-up money")).toContainText("11 not priced yet");
  await expect(gauge(page, "Start-up money")).not.toContainText("$0");
  await expect(gauge(page, "Your date")).toContainText("not set");

  // Next on your road agrees with the map's chips: nothing is done until the person marks it (2026-10-23;
  // until then stage 0 was drawn done for everyone and left off), so the list starts at stage 0, then the
  // before-you-open steps that follow it in the first column. The panel shows three items. The Steps gauge
  // names the same first step, and the map calls stage 0 its starting point, never "done".
  const next = page.getByRole("region", { name: "Next on your road" });
  // Its list of steps (the line carried the folded legend's and what-if bar's buttons 2026-10-17 to 10-20).
  await expect(next.getByRole("listitem").getByRole("button")).toHaveText([
    "1 · Employee/Apprentice baseline",
    "2 · Register your business name, if you use one",
    "3 · Look up your permits and licences (BizPaL)",
  ]);
  await expect(gauge(page, "Steps")).toContainText("next on your road: “Employee/Apprentice baseline”");
  await expect(stage(page, "Employee/Apprentice baseline")).toHaveAccessibleName(/^Employee\/Apprentice baseline, starting point, /);
  await expect(stage(page, "Sole Prop activation")).toHaveAccessibleName(/^Sole Prop activation, first stage, /);

  // The overlays: Road is always on. A first visit has only Road and Skills on (the calm first view,
  // 2026-10-17; until then Rules & tax started on). Money and Rules & tax are off with their switches drawn,
  // so the rules and tax cards are one click away (a review of the calm first view found them two).
  await expect(overlays(page).getByText("always on")).toBeVisible();
  await expect(overlays(page).getByRole("button", { name: /^Skills/ })).toHaveAttribute("aria-pressed", "true");
  const rules = overlays(page).getByRole("button", { name: /^Rules & tax/ });
  await expect(rules).toBeVisible();
  await expect(rules).toHaveAttribute("aria-pressed", "false");
  await expect(overlays(page).getByRole("button", { name: /^Money/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show more layers" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Write-off: / })).toHaveCount(0);
  await rules.click();
  await expect(rules).toHaveAttribute("aria-pressed", "true");
  const lever = page.getByRole("button", { name: /^Write-off: .*, opens detail$/ }).first();
  await expect(lever).toBeVisible();
  await rules.click();
  await expect(rules).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: /^Write-off: / })).toHaveCount(0);
  await rules.click();
  await expect(lever).toBeVisible();
  const moneyToggle = overlays(page).getByRole("button", { name: /^Money/ });
  await expect(moneyToggle).toHaveAttribute("aria-pressed", "false");
  await moneyToggle.click();
  await expect(moneyToggle).toHaveAttribute("aria-pressed", "true");

  // A step: the step panel keeps node detail and adds the person's status.
  await stage(page, "Sole Prop activation").click();
  await expect(stepPanel(page).getByText("For you on this stage", { exact: false })).toBeVisible();
  await expect(stepPanel(page).getByText(/Sources for this stage · \d+/)).toBeVisible();
  // Its seven named start-up lines, each a blank with no amount and a box for the person's own quote.
  const startUp = soleProp.costs.filter((c) => c.kind === "named");
  expect(startUp).toHaveLength(7);
  for (const cost of startUp) {
    // By the line's own name, exactly: "Software" alone would also match a lever card's words.
    const row = stepPanel(page).getByRole("listitem").filter({ has: page.getByText(cost.label, { exact: true }) });
    await expect(row).toContainText("not priced yet");
    await expect(row.getByRole("button", { name: "Add your quote" })).toBeVisible();
    await expect(row).not.toContainText("$");
  }
  const done = stepPanel(page).getByRole("button", { name: "Done", exact: true });
  await expect(done).toHaveAttribute("aria-pressed", "false");
  await done.click();
  await expect(done).toHaveAttribute("aria-pressed", "true");
  await expect(gauge(page, "Steps")).toContainText(`1 of ${road0Steps} marked done`);
  await expect(stage(page, "Sole Prop activation")).toHaveAccessibleName(/^Sole Prop activation, done, /);
  // The readout says the same from the person's own mark, and only there; each chip stays where the stage sits on
  // the map (2026-10-24).
  await expect
    .poll(async () => {
      const readout = (await (await page.request.get(`/api/readout?venture=${ventureId}`)).json()) as {
        nodes: { id: string; chip: string; yourStatus: string | null }[];
      };
      return readout.nodes.filter((n) => n.id === soleProp.id || n.id === "stage-0-employee-apprentice-baseline");
    })
    .toEqual([
      expect.objectContaining({ id: "stage-0-employee-apprentice-baseline", chip: "starting-point", yourStatus: null }),
      expect.objectContaining({ id: soleProp.id, chip: "first-stage", yourStatus: "done" }),
    ]);
  // Its cited "done when" lines (2026-10-12): marking the step done ticks none of them.
  await expect(stepPanel(page).getByText(`0 of ${soleProp.doneWhen.length} ticked`)).toBeVisible();
  await expect(stepPanel(page).getByRole("checkbox", { name: soleProp.doneWhen[0]!.text })).not.toBeChecked();
  await expect(stepPanel(page).getByText("No “done when” lines are written for this step yet.")).toHaveCount(0);

  // Next on your road: in road order, and never the step marked done.
  await expect(next.getByText("the order steps happen, not importance")).toBeVisible();
  await expect(next.getByRole("button", { name: /Sole Prop activation/ })).toHaveCount(0);

  // Skills: the gauge opens the list; a skill of your own, marked have.
  await gauge(page, "Skills").click();
  const skills = page.getByRole("region", { name: "Skills on this road" });
  await skills.getByLabel("A skill in your own words").fill("Welding (invented)");
  await skills.getByRole("button", { name: "Add as have" }).click();
  const welding = skills.getByRole("listitem").filter({ hasText: "Welding (invented)" });
  await expect(welding.getByRole("button", { name: "Have", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(gauge(page, "Skills")).toContainText("your own skills: 1 have · 0 learning · 0 not yet");
  // A skill the person typed is taken away by a button that says so.
  await expect(welding.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
  await expect(welding.getByRole("button", { name: "I don't know" })).toHaveCount(0);
  // A second press on the gauge closes its list and un-presses it.
  await expect(gauge(page, "Skills")).toHaveAttribute("aria-pressed", "true");
  await gauge(page, "Skills").click();
  await expect(gauge(page, "Skills")).toHaveAttribute("aria-pressed", "false");
  await expect(skills).toHaveCount(0);

  // Money: savings go through the agree prompt and count only once agreed.
  await gauge(page, "Start-up money").click();
  const money = page.getByRole("region", { name: "Start-up money" });
  await money.getByRole("button", { name: "Add your savings" }).click();
  await money.getByLabel("Amount").fill("12,000");
  await money.getByRole("button", { name: "Next: agree" }).click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt.getByText("Savings you'd put toward starting", { exact: false })).toBeVisible();
  await expect(gauge(page, "Start-up money")).toContainText("savings: not given yet");
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toHaveCount(0);
  await expect(gauge(page, "Start-up money")).toContainText("savings $12,000");

  // Your date: a month and year, counted from today.
  await gauge(page, "Your date").click();
  const date = page.getByRole("region", { name: "Your date" });
  await date.getByLabel("Month and year").fill("2099-05");
  await date.getByRole("button", { name: "Save", exact: true }).click();
  await expect(gauge(page, "Your date")).toContainText("May 2099");
  await expect(gauge(page, "Your date")).toContainText(/\d+ months from today/);

  // A reload reads everything back from the data file, and the overlays last on from this browser (the
  // last overlay picked, remembered since 2026-10-17).
  await page.reload();
  await expect(overlays(page).getByRole("button", { name: /^Rules & tax/ })).toHaveAttribute("aria-pressed", "true");
  await expect(overlays(page).getByRole("button", { name: /^Money/ })).toHaveAttribute("aria-pressed", "true");
  await expect(gauge(page, "Steps")).toContainText(`1 of ${road0Steps} marked done`);
  await expect(gauge(page, "Skills")).toContainText("your own skills: 1 have · 0 learning · 0 not yet");
  await expect(gauge(page, "Start-up money")).toContainText("savings $12,000");
  await expect(gauge(page, "Your date")).toContainText("May 2099");
  await stage(page, "Sole Prop activation").click();
  await expect(stepPanel(page).getByRole("button", { name: "Done", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Pressing the status that's on takes it back.
  await stepPanel(page).getByRole("button", { name: "Done", exact: true }).click();
  await expect(gauge(page, "Steps")).toContainText(`0 of ${road0Steps} marked done`);
});

// The calm first view (2026-10-17, S2.5.30c; docs/ui-spec/cockpit/12-folding-and-phone.md): a first visit shows
// the road, the goal and the next steps, everything else folded (the legend and the what-if bar behind Look
// closer since 2026-10-20); a return visit opens the way the person left it.
test("the calm first view: the road, the goal and the next steps, everything else folded within reach, and a return visit as left", async ({
  page,
}) => {
  const ventureId = await saveIdea(page, "Invented — calm first view test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  const button = (name: string) => page.getByRole("button", { name, exact: true });

  // Drawn: the goal and its gauges, the road's first two columns, Next on your road, the one coach line.
  await expect(gauge(page, "Steps")).toBeVisible();
  await expect(stage(page, "Sole Prop activation")).toBeVisible();
  await expect(page.getByRole("region", { name: "Next on your road" }).getByRole("button").first()).toBeVisible();
  const coach = page.getByRole("note", { name: "A first look" });
  await expect(coach).toHaveText(/^Start anywhere\. Each thing you tell us lights up part of the road\. Click anything to see where it comes from\./);

  // Folded: the rail and the road ahead, each with the one button that shows it, and the legend and the
  // what-if bar, shown from Look closer (2026-10-20). Nothing is gone: each opens and its content is there. Every overlay switch is
  // drawn, Money and Rules & tax off (2026-10-17, after a review found them behind a second click).
  await expect(overlays(page).getByRole("button", { name: /^Rules & tax/ })).toHaveAttribute("aria-pressed", "false");
  await expect(overlays(page).getByRole("button", { name: /^Money/ })).toHaveAttribute("aria-pressed", "false");
  await expect(button("Fold venture details")).toBeHidden();
  await expect(page.getByRole("group", { name: "Legend" })).toBeHidden();
  await expect(page.getByRole("region", { name: "What-if" })).toBeHidden();
  await expect(stage(page, "Incorporating")).toBeHidden();
  const ahead = page.getByRole("button", { name: "Show the road ahead: Incorporating · Corporation running (6 steps)", exact: true });
  await expect(ahead).toHaveAttribute("aria-expanded", "false");
  await expect(ahead).toContainText("The road ahead · 6 steps");

  await ahead.click();
  await expect(stage(page, "Incorporating")).toBeVisible();
  await expect(button("Fold the road ahead")).toBeFocused();
  await button("Show venture details").click();
  await expect(page.getByRole("heading", { name: "What you've told DotAmi" })).toBeVisible();
  // The legend and the what-if bar are shown from Look closer, after what it opens in the right-hand panel
  // (2026-10-20: two controls fewer on a tablet's or a laptop's first view than a button each under the road).
  await expect(page.getByRole("region", { name: "Next on your road" }).getByRole("button", { name: /^Show the / })).toHaveCount(0);
  expect(await lookCloserItems(page, goalBar(page))).toEqual(["Others in this line of work", "Show the legend", "Show the what-if bar"]);
  // Each says what it shows, for a screen reader (the what-if bar alone: This visit is empty on a first visit).
  await goalBar(page).getByRole("button", { name: "Look closer" }).click();
  await expect(page.getByRole("menuitem", { name: "Show the legend", exact: true })).toHaveAttribute("aria-controls", "cockpit-map-legend");
  await expect(page.getByRole("menuitem", { name: "Show the what-if bar", exact: true })).toHaveAttribute("aria-controls", "cockpit-what-if");
  await page.keyboard.press("Escape");
  await openFromLookCloser(page, "Show the legend", goalBar(page));
  await expect(page.getByRole("group", { name: "Legend" })).toContainText("applies as answered");
  await expect(button("Fold the legend")).toBeFocused();
  await openFromLookCloser(page, "Show the what-if bar", goalBar(page));
  await expect(page.getByRole("region", { name: "What-if" }).getByLabel("Try first-year sales of $")).toBeVisible();

  // Look closer: one menu button in the goal bar, keyboard first. Road 0 offers no Compare (2026-10-13).
  const lookCloser = goalBar(page).getByRole("button", { name: "Look closer" });
  await expect(lookCloser).toHaveAttribute("aria-haspopup", "menu");
  expect(await lookCloserItems(page, goalBar(page))).toEqual(["Others in this line of work"]);
  await lookCloser.focus();
  await page.keyboard.press("ArrowDown");
  const item = page.getByRole("menuitem", { name: "Others in this line of work" });
  await expect(item).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(item).toHaveCount(0);
  await expect(lookCloser).toBeFocused();
  await expect(lookCloser).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(item).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Others in this line of work" })).toBeVisible();

  // Got it puts the coach line away, and it doesn't come back.
  await coach.getByRole("button", { name: "Got it" }).click();
  await expect(coach).toHaveCount(0);

  // A return visit: what was opened stays open, and the coach line stays away.
  await button("Fold the legend").click();
  await page.reload();
  await expect(gauge(page, "Steps")).toBeVisible();
  await expect(stage(page, "Incorporating")).toBeVisible();
  await expect(button("Fold venture details")).toBeVisible();
  await expect(page.getByRole("region", { name: "What-if" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Legend" })).toBeHidden();
  expect(await lookCloserItems(page, goalBar(page))).toEqual(["Others in this line of work", "Show the legend"]);
  await expect(page.getByRole("note", { name: "A first look" })).toHaveCount(0);
});

test("a browser that kept its folds before the calm first view comes back as it was left: Rules & tax on, and no coach line", async ({ page }) => {
  // A review (2026-10-17) set the five answers main kept before the calm view, everything open, and found
  // this browser opening with Rules & tax switched off (on for every visit until then) and the tip back.
  await page.addInitScript(() => {
    try {
      if (window.localStorage.getItem("dotami-cockpit-folds") === null) {
        window.localStorage.setItem("dotami-cockpit-folds", JSON.stringify({ rail: false, goal: false, panel: false, legend: false, whatIf: false }));
      }
    } catch {
      // A page with no storage of its own: nothing to do.
    }
  });
  const ventureId = await saveIdea(page, "Invented — kept before the calm view test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  await expect(page.getByRole("button", { name: "Fold venture details", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Legend" })).toBeVisible();
  await expect(overlays(page).getByRole("button", { name: /^Rules & tax/ })).toHaveAttribute("aria-pressed", "true");
  await expect(overlays(page).getByRole("button", { name: /^Skills/ })).toHaveAttribute("aria-pressed", "false");
  await expect(overlays(page).getByRole("button", { name: /^Money/ })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("note", { name: "A first look" })).toHaveCount(0);
});

test("skills: road 0's legal requirement on its step, and the government's list for the job you pick, kept after a reload", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — job pick test");
  await page.goto(`/cockpit?venture=${ventureId}`);

  // Road 0's one legal requirement sits on its own step, with its source, from the compliance catalog.
  await stage(page, "Mandatory GST registration").click();
  const gst = stepPanel(page).getByRole("listitem").filter({ hasText: "A GST/HST registration with the Canada Revenue Agency" });
  await expect(gst.getByText("legal requirement")).toBeVisible();
  // Nothing picked yet: the step panel invites the person to the list, without tying it to the step.
  await expect(stepPanel(page).getByText("Pick the job closest to your work to see the government's skills list for it.")).toBeVisible();
  await stepPanel(page).getByRole("button", { name: "Pick a job", exact: true }).click();

  // The Skills list: one optional question and a search box.
  const skills = page.getByRole("region", { name: "Skills on this road" });
  await expect(skills.getByText("Pick the job closest to the work you'd do yourself")).toBeVisible();
  // The same search as Pick a future's first step (2026-10-22, one picker): the government's example titles.
  const search = skills.getByRole("searchbox", { name: "The work, in your own words" });
  // The job names searched are the government's, so the licence's line is there before any pick.
  await expect(skills.getByText("Contains information licensed under the Open Government Licence – Canada.")).toBeVisible();
  // More in a part than are shown: the screen says so, with the count (since whole words first, a-call-11, the
  // cap is each part's: "manager" word for word holds more than 50 jobs).
  await search.fill("manager");
  await expect(skills.getByText(/^Showing the first 50 of \d+ in this part, in code order\. Add a word to narrow it\.$/).first()).toBeVisible();
  // Every word typed, grouped by how many of them a job's titles hold.
  await search.fill("restaurant manager");
  await expect(skills.getByRole("button", { name: "Pick Restaurant and food service managers, 60030.00", exact: true })).toBeVisible();
  await search.fill("cabinet");
  await skills.getByRole("button", { name: "Pick Cabinetmakers, 72311.00", exact: true }).click();

  // The government's list for that job: every row tagged, the licence's line, no rating anywhere.
  await expect(skills.getByText(/^Cabinetmakers · 72311\.00 · picked \d{4}-\d{2}-\d{2}$/)).toBeVisible();
  const numeracy = skills.getByRole("listitem").filter({ has: page.getByText("Numeracy", { exact: true }) });
  await expect(numeracy.getByText("your pick of job")).toBeVisible();
  await expect(skills.getByText("your pick of job", { exact: true })).toHaveCount(44);
  await expect(skills.getByText("Contains information licensed under the Open Government Licence – Canada.")).toBeVisible();
  await expect(skills).not.toContainText(/Level|on a scale|Not applicable/);
  await numeracy.getByRole("button", { name: "Have", exact: true }).click();
  await expect(numeracy.getByRole("button", { name: "Have", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(gauge(page, "Skills")).toContainText("your pick of job: 1 have · 0 learning · 0 not yet, of 44 listed");

  // A reload reads the pick and the mark back from the data file.
  await page.reload();
  await expect(gauge(page, "Skills")).toContainText("your pick of job: 1 have · 0 learning · 0 not yet, of 44 listed");
  await stage(page, "Mandatory GST registration").click();
  await expect(stepPanel(page).getByText(/^Your pick of job, “Cabinetmakers”: 44 on the government's list, 1 marked\./)).toBeVisible();
  await stepPanel(page).getByRole("button", { name: "Open the list", exact: true }).click();
  await expect(skills.getByRole("listitem").filter({ has: page.getByText("Numeracy", { exact: true }) }).getByRole("button", { name: "Have", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Change it: the search again, another job, and the mark on Numeracy carries over (one id per skill).
  await skills.getByRole("button", { name: "Change", exact: true }).click();
  await skills.getByRole("searchbox", { name: "The work, in your own words" }).fill("72310");
  await skills.getByRole("button", { name: "Pick Carpenters, 72310.00", exact: true }).click();
  await expect(skills.getByText(/^Carpenters · 72310\.00 · picked /)).toBeVisible();
  await expect(gauge(page, "Skills")).toContainText(/your pick of job: 1 have · 0 learning · 0 not yet, of \d+ listed/);

  // "I don't know" takes the mark off, so the other tests in this run see the person's marks as they were.
  const numeracyNow = skills.getByRole("listitem").filter({ has: page.getByText("Numeracy", { exact: true }) });
  await numeracyNow.getByRole("button", { name: "I don't know", exact: true }).click();
  await expect(gauge(page, "Skills")).toContainText(/your pick of job: 0 have · 0 learning · 0 not yet, of \d+ listed/);

  // Take it back: the question again, and nothing of the pick is kept.
  await skills.getByRole("button", { name: "Take back", exact: true }).click();
  await expect(skills.getByText("Pick the job closest to the work you'd do yourself")).toBeVisible();
  await expect(gauge(page, "Skills")).not.toContainText("your pick of job");
  const kept = (await (await page.request.get(`/api/futures/${ventureId}`)).json()) as { future: { job: unknown } };
  expect(kept.future.job).toBeNull();
});

// A "done when" line and a quote need a road that has them. Road 0's are written in their own pull
// request, and so is the first written future; until one ships, this test says so and is skipped, and
// tests/cockpit-screen.spec.ts covers both on an invented road. Once a shipped road has both, it runs
// as it is, with nothing to change here.
const withLines = roadsV2026.find(
  (road) => road.steps.some((s) => s.doneWhen.length > 0) && road.steps.some((s) => s.costs.some((c) => c.kind === "named")),
);
test("a done-when line ticked and a quote agreed on a step are kept after a reload", async ({ page }) => {
  test.skip(!withLines, "No shipped road has a “done when” line and a named cost line yet.");
  const road = withLines!;
  const ventureId = await saveIdea(page, "Invented — done when test");
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId: road.id, roadChosenAt: new Date() } }));
  const lineStep = road.steps.find((s) => s.doneWhen.length > 0)!;
  const costStep = road.steps.find((s) => s.costs.some((c) => c.kind === "named"))!;
  const costLine = costStep.costs.find((c) => c.kind === "named")!;
  await page.goto(`/cockpit?venture=${ventureId}`);

  await stage(page, lineStep.label).click();
  const box = stepPanel(page).getByRole("checkbox", { name: lineStep.doneWhen[0]!.text });
  await box.check();
  await expect(stepPanel(page).getByText(`1 of ${lineStep.doneWhen.length} ticked`)).toBeVisible();

  await stage(page, costStep.label).click();
  const line = stepPanel(page).getByRole("listitem").filter({ hasText: costLine.label });
  await line.getByRole("button", { name: "Add your quote" }).click();
  await line.getByLabel("Amount").fill("3,400");
  await line.getByLabel("Where it came from").selectOption("quote");
  await line.getByRole("button", { name: "Next: agree" }).click();
  await page.getByRole("dialog", { name: "Agree to these figures?" }).getByRole("button", { name: "Agree", exact: true }).click();
  await expect(line).toContainText("$3,400");
  await expect(line).toContainText("your quote · agreed");

  await page.reload();
  await stage(page, lineStep.label).click();
  await expect(stepPanel(page).getByRole("checkbox", { name: lineStep.doneWhen[0]!.text })).toBeChecked();
  await stage(page, costStep.label).click();
  await expect(stepPanel(page).getByRole("listitem").filter({ hasText: costLine.label })).toContainText("$3,400");
});

// A box shows the person's click at once, while the save is on its way, and goes back with the reason
// when the save is refused: it never stays ticked over a refusal, and never ignores the click.
test("a tick shows as soon as it is clicked, and a refused tick is taken back with the reason", async ({ page }) => {
  test.skip(!withLines, "No shipped road has a “done when” line yet.");
  const road = withLines!;
  const ventureId = await saveIdea(page, "Invented — refused tick test");
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId: road.id, roadChosenAt: new Date() } }));
  const lineStep = road.steps.find((s) => s.doneWhen.length > 0)!;

  // The save is held until the box has been looked at, then refused the way the server refuses one.
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/futures/*/progress", async (route) => {
    await held;
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Refused for this test." }) });
  });
  await page.goto(`/cockpit?venture=${ventureId}`);

  await stage(page, lineStep.label).click();
  const box = stepPanel(page).getByRole("checkbox", { name: lineStep.doneWhen[0]!.text });
  await box.click();
  await expect(box).toBeChecked();
  await expect(box).toBeDisabled();
  release();
  await expect(stepPanel(page).getByRole("alert")).toHaveText("Refused for this test.");
  await expect(box).not.toBeChecked();
  await expect(box).toBeEnabled();
  await expect(stepPanel(page).getByText(`0 of ${lineStep.doneWhen.length} ticked`)).toBeVisible();
});
