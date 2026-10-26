/**
 * The app's main paths, in a real browser against a real (throwaway) database.
 *
 * Each test is something a person does, checked the way they'd see it. When a new screen
 * lands, its main path gets a test here; edge cases come from
 * docs/architecture/settings-and-edge-cases.md.
 */
import http from "node:http";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Download, type Locator, type Page, type Worker } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { SETTING_GROUPS, SETTINGS } from "../lib/settings/catalog";
import { INVENTED_AMOUNTS, otherFormPage, t2125Pages } from "../tests/fixtures/returns/cra-layout";
import { gnucashGz, gnucashXml, smallBook } from "../tests/helpers/make-gnucash";
import { makePdf } from "../tests/helpers/make-pdf";
import { makeXlsx, type XlsxCell } from "../tests/helpers/make-xlsx";
import { ownedByReact, waitForReact } from "../tests/helpers/react-ready";
import { files as freshbooksFiles } from "../tests/fixtures/packages/freshbooks";
import { files as sage50Files } from "../tests/fixtures/packages/sage-50-canadian";
import { files as waveFiles } from "../tests/fixtures/packages/wave";
import { files as xeroFiles } from "../tests/fixtures/packages/xero";
import { launchSecretHeaders } from "./launch-secret";

import { startAsAReturnVisit } from "./cockpit-calm";
import { openTheMapFromTheIntake } from "./three-steps";

/**
 * One of the intake's dropdowns, found by the name a screen reader says for it ("Province /
 * territory", "Current employment"). Until 2026-10-12 the name above each was a plain <p> tied to
 * nothing, so the dropdowns had no name and this test took "the select after that text" instead.
 */
function groupSelect(page: Page, label: string) {
  return page.getByRole("combobox", { name: label, exact: true });
}

// These tests read the map's content and the other screens, not how the cockpit first looks: each starts as
// a person who had opened everything on the cockpit (a return visit, e2e/cockpit-calm.ts), as every cockpit
// looked before the calm first view of 2026-10-17. The first view is held by cockpit.spec.ts, journey.spec.ts
// and the clutter limit.
test.beforeEach(async ({ page }) => {
  await startAsAReturnVisit(page);
});

test("one sentence becomes a saved map", async ({ page }) => {
  // Let the page finish loading so the test types into the live page. (This test is what caught
  // the landing page being dead in production builds: its scripts were blocked by the CSP and
  // "Map it" never enabled — fixed in app/layout.tsx.)
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByPlaceholder(/What are you building/).fill("A mobile bike repair business with a van in Calgary");
  await page.getByRole("button", { name: "Map it →" }).click();

  // The demo ideas are saved, so the intake skips About you and opens on the screen we came for (#38).
  await expect(page).toHaveURL(/\/intake/);

  // Confirm what was understood: "repair" is a trade, not AI (#2), and the chips say so to a
  // screen reader (#12).
  await expect(page.getByRole("button", { name: "Trades", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "AI / ML / R&D", exact: true })).toHaveAttribute("aria-pressed", "false");
  // The "add your own" box has a name of its own, not only its placeholder, which a screen reader
  // may not read and which disappears once something is typed.
  await expect(page.getByPlaceholder("Add your own — press Enter")).toHaveAttribute("aria-label", "Add your own kind of work");
  await page.getByRole("button", { name: "Looks right →" }).click();

  // Ground it: Calgary was read as Alberta; the map won't open until employment is chosen (#7).
  await expect(groupSelect(page, "Province / territory")).toHaveValue("AB");
  // Since 2026-10-22 Screen B's button opens Pick a future's three steps on this page; the map opens from them.
  const openMap = page.getByRole("button", { name: "Next: the work closest to yours →" });
  await expect(openMap).toBeDisabled();
  // The box "Other…" opens is named the same way.
  await groupSelect(page, "Current employment").selectOption("other");
  await expect(page.getByPlaceholder("Tell us in your words")).toHaveAttribute("aria-label", "Your employment, in your words");
  await groupSelect(page, "Current employment").selectOption("self-employed");
  await expect(openMap).toBeEnabled();
  // The name box is named by its label too, not only by its placeholder.
  await expect(page.getByRole("textbox", { name: "Name it — optional", exact: true })).toBeVisible();
  await openTheMapFromTheIntake(page);

  // The map, with named stage cards.
  await expect(page).toHaveURL(/\/cockpit/);
  await expect(page.getByRole("button", { name: /^Sole Prop activation, / })).toBeVisible();

  // Saved: the ideas page lists it after a fresh load, with its tag.
  await page.goto("/ventures");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "My venture", level: 2 }) });
  await expect(card).toBeVisible();
  await expect(card.getByText("Trades", { exact: true })).toBeVisible();
});

// 2026-10-11: the server sends the front page already drawn, so its box can be typed into before the
// page's scripts have run. Words typed then sat in the box while "Map it" stayed greyed out (React
// started from an empty box and never heard them). CI's desktop test hit it three times in about 15
// hours; a person on a slow computer could too.
test("words typed on the front page before it has finished loading are kept, and Map it takes them", async ({ page }) => {
  const sentence = "A mobile bike repair business with a van in Calgary";
  // Hold back the page's scripts until the box has been typed into: the page as a slow computer shows it.
  let letScriptsThrough!: () => void;
  const scriptsHeld = new Promise<void>((resolve) => (letScriptsThrough = resolve));
  await page.route("**/_next/static/**/*.js", async (route) => {
    await scriptsHeld;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  const box = page.getByPlaceholder(/What are you building/);
  await box.fill(sentence);
  // Typed before React took the page over: not a test of the ordinary path by accident.
  expect(await box.evaluate(ownedByReact)).toBe(false);

  letScriptsThrough();
  await waitForReact(box);
  const mapIt = page.getByRole("button", { name: "Map it →" });
  // Both checked, so a failure says which half went wrong: the words gone, the button greyed out, or both.
  await expect.soft(box).toHaveValue(sentence);
  await expect.soft(mapIt).toBeEnabled();
  expect(test.info().errors).toHaveLength(0);
  await mapIt.click();

  // The intake got the words: "repair" was read as a trade.
  await expect(page).toHaveURL(/\/intake/);
  await expect(page.getByRole("button", { name: "Trades", exact: true })).toHaveAttribute("aria-pressed", "true");
});

// The same fix seen from the other side: leave the front page with a full page load and press Back,
// and the browser itself puts the old words back in the box before the page's scripts run. Until
// 2026-10-11 they showed for a moment and were emptied, with "Map it" greyed out; now they stay and
// Map it takes them (docs/ui-spec/landing/01-free-text-entry.md).
test("words the browser puts back in the front page's box after Back stay, and Map it takes them", async ({ page }) => {
  const sentence = "A mobile bike repair business with a van in Calgary";
  await page.goto("/");
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  await box.fill(sentence);
  // A full page load away (not an in-app link, which would draw the front page fresh and empty).
  await page.goto("/settings");
  await page.goBack();

  const back = page.getByPlaceholder(/What are you building/);
  await waitForReact(back);
  await page.waitForLoadState("networkidle");
  const mapIt = page.getByRole("button", { name: "Map it →" });
  await expect.soft(back).toHaveValue(sentence);
  await expect.soft(mapIt).toBeEnabled();
  expect(test.info().errors).toHaveLength(0);
  await mapIt.click();
  await expect(page).toHaveURL(/\/intake/);
});

// 2026-10-11: the sentence typed on the front door used to live only in the tab and was lost when it
// closed. It is now kept with the idea, dated and word for word (docs/ui-spec/landing/01-free-text-entry.md).
test("the sentence typed on the front door is kept with the idea, word for word and dated, after the tab is gone", async ({ page, browser }) => {
  // Odd spacing and quotation marks: word for word means all of it.
  const sentence = `Hand-lettered  signs for “food trucks” in Calgary ${Date.now()}`;
  await page.goto("/", { waitUntil: "networkidle" });
  const today = await page.evaluate(() => new Date().toLocaleDateString("en-CA"));
  await page.getByPlaceholder(/What are you building/).fill(sentence);
  await page.getByRole("button", { name: "Map it →" }).click();
  await expect(page).toHaveURL(/\/intake/);
  // A goal the person picks themselves.
  await page.getByRole("button", { name: "Replace income", exact: true }).click();
  await expect(page.getByRole("button", { name: "Replace income", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Looks right →" }).click();
  await groupSelect(page, "Current employment").selectOption("self-employed");
  await page.getByPlaceholder(/What the map should call this venture/).fill("Invented — first words test");
  await openTheMapFromTheIntake(page);
  await expect(page).toHaveURL(/\/cockpit/);

  // Back through the intake from the map, in the same tab: opening a future again makes a second idea, and the
  // sentence, already kept with the first, is not written again (review of 2026-10-11).
  await page.getByRole("link", { name: "Edit venture profile" }).click();
  await expect(page).toHaveURL(/\/intake/);
  await page.getByRole("button", { name: "Looks right →" }).click();
  await page.getByPlaceholder(/What the map should call this venture/).fill("Invented — first words test, again");
  await openTheMapFromTheIntake(page);
  await expect(page).toHaveURL(/\/cockpit/);

  // A new window with nothing in its tab storage: what shows comes from the data file.
  // A context made by hand doesn't take the config's headers: it is given the launch secret itself.
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin, extraHTTPHeaders: launchSecretHeaders() });
  const fresh = await context.newPage();
  await fresh.goto("/ventures");
  const card = fresh.getByRole("listitem").filter({ has: fresh.getByRole("heading", { name: "Invented — first words test", exact: true, level: 2 }) });
  await expect(card.getByText(`In your words, ${today}`, { exact: true })).toBeVisible();
  await expect(card.getByText(`“${sentence}”`, { exact: true })).toBeVisible();
  // The goal chips as they stood on the intake (some may have been marked from the sentence, and confirmed there).
  await expect(card.getByText(/^Goals marked on the intake: /)).toContainText("Replace income");
  // Once on the whole page: the second idea carries no copy.
  await expect(fresh.getByText(`“${sentence}”`, { exact: true })).toHaveCount(1);

  // It is one of the person's statements, so What DotAmi knows counts it and Delete takes it with them.
  const statements = (await (await fresh.request.get("/api/person/statements")).json()) as { statements: { text: string; saidAt: string }[] };
  expect(statements.statements.filter((s) => s.text === sentence)).toEqual([expect.objectContaining({ text: sentence, saidAt: today })]);
  // About you lists it with the idea it was typed for, not as "typed here". With ideas saved the intake
  // opens on the screen after it (#38), and Back reaches it.
  await fresh.goto("/intake");
  await fresh.getByRole("button", { name: "← Back" }).click();
  const row = fresh.getByRole("listitem").filter({ hasText: sentence });
  await expect(row.getByText("typed for your idea “Invented — first words test”", { exact: true })).toBeVisible();
  // The list has loaded, so any status line would be drawn by now. None is about an external source
  // of statements, which no copy of DotAmi has set up: "Vault: No external statement source
  // configured." showed to everyone and meant nothing to a stranger (#6, 2026-10-12).
  await expect(fresh.getByText(/external statement source/i)).toHaveCount(0);
  await expect(fresh.getByText(/^Vault:/)).toHaveCount(0);
  await context.close();
});

// 2026-10-11: the cockpit ran the rules on the default picks, so flipping a toggle moved the chips but
// not the colours; and "Incorporation at $80K net" lit from an amount no page sets. A stage card says
// its colour in words, so this reads the map the way a screen reader would.
test("the map's colours follow your own picks, and Incorporating lights from no amount", async ({ page }) => {
  // An invented idea over the GST/HST line (first-year estimate $45,000) and far past the old $80K one.
  const scenario = {
    id: `picks-${Date.now()}`,
    profile: {
      name: "Invented — picks test",
      type: "service",
      province: "AB",
      targetRevenueY1: 45_000,
      targetRevenueY3: 500_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "self-employed",
      hireFirst: false,
      activityTags: ["Trades"],
      stage: "idea",
    },
    state: {
      activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  const { ventureId } = (await saved.json()) as { ventureId: string };
  await page.goto(`/cockpit?venture=${ventureId}`);

  const stage = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}, `) });
  // The defaults: the mandatory GST/HST card applies as answered; Incorporating is "check first",
  // though the third-year estimate is $500,000. Neither toggle was clicked, so both say "default".
  await expect(stage("Mandatory GST registration")).toHaveAccessibleName(/, default, applies as answered, opens detail$/);
  await expect(stage("Incorporating")).toHaveAccessibleName("Incorporating, default, check first, opens detail");
  await expect(page.getByText("DotAmi doesn't pick a point to incorporate. You do, with your accountant or lawyer.").first()).toBeVisible();

  // Flip GST timing: the voluntary card is now the one that applies, and the other one is a fork.
  await page.getByRole("button", { name: "Voluntary now", exact: true }).click();
  await expect(stage("Voluntary GST registration")).toHaveAccessibleName(/^Voluntary GST registration, your pick, applies as answered, opens detail$/);
  await expect(stage("Mandatory GST registration")).toHaveAccessibleName(/, not on your path, check first, opens detail$/);

  // Flip Incorporation timing: Incorporating leaves the person's path and goes grey.
  await page.getByRole("button", { name: "Liability / SR&ED", exact: true }).click();
  await expect(stage("Incorporating")).toHaveAccessibleName("Incorporating, not on your path, doesn't apply as answered, opens detail");
  await expect(stage("Incorporation for liability/SR&ED")).toHaveAccessibleName(/, your pick, check first, opens detail$/);
});

// 2026-10-11: the map now draws a road (lib/engines/roads/v2026/) instead of reading the tax map's
// tiers itself. Today's map is the road "Starting any business in Alberta" and must look and behave as
// before: the same four columns in order, the same ten cards in their columns, both toggles where they
// were, and hover arrows along the same paths (4 solid and 14 dashed from Sole Prop activation, as
// measured on 2026-09-16, docs/ui-spec/cockpit/03-canvas.md).
// 2026-10-12: the road gained three "before you open" steps in its first column, the only new cards.
// No tax rule reads them, but the cockpit draws every card from road evaluation, which puts them on
// the road, so each is coloured "applies as answered" and opens its step panel like any other step;
// hovering one sends arrows to Sole Prop activation and on along its paths. (Only a map drawn without
// road evaluation says "no rule yet" on them: tests/road-map.spec.ts covers that.)
test("the map draws today's road: columns, cards, toggles and hover arrows, plus the before-you-open steps", async ({ page }) => {
  const scenario = {
    id: `road-${Date.now()}`,
    profile: {
      name: "Invented — road test",
      type: "service",
      province: "AB",
      targetRevenueY1: 20_000,
      targetRevenueY3: 60_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "employee",
      hireFirst: false,
      activityTags: [],
      stage: "idea",
    },
    state: {
      activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  const { ventureId } = (await saved.json()) as { ventureId: string };
  await page.goto(`/cockpit?venture=${ventureId}`);

  const expected = [
    {
      tier: "Tier 1",
      label: "Before the venture",
      cards: [
        "Employee/Apprentice baseline",
        "Register your business name, if you use one",
        "Look up your permits and licences (BizPaL)",
        "A separate bank account for the business, if it has a name other than yours",
        // Since 2026-10-14 (docs/engines/roads.md, road 0's table row).
        "Keep your records from day one",
      ],
      toggle: null,
    },
    {
      tier: "Tier 2",
      label: "Sole proprietor",
      cards: ["Sole Prop activation", "Voluntary GST registration", "Mandatory GST registration"],
      toggle: "GST timing",
    },
    {
      tier: "Tier 3",
      label: "Incorporating",
      cards: ["Incorporating", "Incorporation for liability/SR&ED", "Hire first employee", "Service vs. productize"],
      toggle: "Incorporation timing",
    },
    { tier: "Tier 4", label: "Corporation running", cards: ["Retained earnings planning", "SR&ED deepening"], toggle: null },
  ];
  const columns = page.locator("section").filter({ has: page.getByText(/^Tier \d$/) });
  await expect(columns).toHaveCount(expected.length);
  for (const [i, col] of expected.entries()) {
    const column = columns.nth(i);
    await expect(column.getByText(col.tier, { exact: true })).toBeVisible();
    await expect(column.getByRole("heading", { level: 3 })).toHaveText(col.label);
    await expect(column.getByRole("heading", { level: 4 })).toHaveText(col.cards);
    if (col.toggle) await expect(column.getByRole("group", { name: col.toggle })).toBeVisible();
    else await expect(column.getByRole("group")).toHaveCount(0);
  }

  // Hover Sole Prop activation: arrows to every step after it, and only the cards before it dim.
  await page.getByRole("button", { name: /^Sole Prop activation, / }).hover();
  await expect(page.locator('svg path[marker-end="url(#map-arrow-solid)"]')).toHaveCount(4);
  await expect(page.locator('svg path[marker-end="url(#map-arrow-faint)"]')).toHaveCount(14);
  await expect(page.locator("div.opacity-35").getByRole("heading", { level: 4 })).toHaveText(expected[0]!.cards);

  // A before-you-open card is on the road as road evaluation reads it: "ahead", coloured "applies as
  // answered", never "no rule yet" in the cockpit. Hovering it sends one solid arrow to Sole Prop
  // activation and the 18 after it, dashed.
  const bizpal = page.getByRole("button", { name: /^Look up your permits and licences \(BizPaL\), / });
  await expect(bizpal).toHaveAccessibleName("Look up your permits and licences (BizPaL), ahead, applies as answered, opens detail");
  await expect(page.getByText("no rule yet", { exact: true })).toHaveCount(0);
  await bizpal.hover();
  await expect(page.locator('svg path[marker-end="url(#map-arrow-solid)"]')).toHaveCount(1);
  await expect(page.locator('svg path[marker-end="url(#map-arrow-faint)"]')).toHaveCount(18);
  // The other four first-column cards dim: the baseline and the other before-you-open cards, none of
  // which it leads to (docs/ui-spec/cockpit/03-canvas.md gives these counts).
  await expect(page.locator("div.opacity-35").getByRole("heading", { level: 4 })).toHaveText(
    expected[0]!.cards.filter((c) => c !== "Look up your permits and licences (BizPaL)"),
  );

  // Clicking it opens its step panel in Export's place, with its own cited "done when" lines, the
  // same as a card with a catalog entry.
  const exportPanel = page.locator("pre");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(exportPanel).toBeVisible();
  await bizpal.click();
  await expect(bizpal).toHaveAttribute("aria-pressed", "true");
  const stepPanel = page.getByRole("region", { name: "Step" });
  await expect(stepPanel.getByRole("heading", { level: 2 })).toHaveText("Look up your permits and licences (BizPaL)");
  await expect(stepPanel.getByText("0 of 4 ticked")).toBeVisible();
  await expect(exportPanel).toHaveCount(0);
  // A card with a catalog entry opens its detail panel there too, as before.
  await page.getByRole("button", { name: /^Sole Prop activation, / }).click();
  await expect(page.getByRole("button", { name: "Close node detail panel" })).toBeVisible();
  await expect(exportPanel).toHaveCount(0);

  // Issue #40: this idea names no kind of work, so the research tax credit step is off its path with the
  // reason, never "ahead", and is still drawn and still opens (tests/research-steps.spec.ts). The reason
  // says what is on the idea, never what the person did or didn't tell DotAmi.
  const noKindsOfWork =
    "This idea has no kinds of work on it, and this step is on your path only with one of Software / SaaS, Manufacturing or AI / ML / R&D.";
  const sred = page.getByRole("button", { name: /^SR&ED deepening, / });
  await expect(sred).toHaveAccessibleName("SR&ED deepening, not on your path, doesn't apply as answered, opens detail");
  await expect(sred).toHaveAccessibleDescription(noKindsOfWork);
  await expect(sred).toHaveClass(/border-dashed/);
  await sred.click();
  await expect(stepPanel.getByRole("heading", { level: 2 })).toHaveText("SR&ED deepening");
  await expect(stepPanel.getByText(noKindsOfWork, { exact: true })).toBeVisible();
});

// 2026-10-11 (option B, docs/engines/citations.md): every source says how it was checked. Every
// source on the map today was read, and for the map's own stages nobody recorded who read it, so the
// stage's sources and the playbook export say "Read on <date>. Who read it wasn't recorded." and never
// claim a person; the readout says the same words as the screens, and none says "verified" any more.
test("every source says how it was checked: the map's sources, the playbook export and the readout", async ({ page }) => {
  const scenario = {
    id: `checked-${Date.now()}`,
    profile: {
      name: "Invented — sources test",
      type: "service",
      province: "AB",
      targetRevenueY1: 10_000,
      targetRevenueY3: 20_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "self-employed",
      hireFirst: false,
      activityTags: ["Trades"],
      stage: "idea",
    },
    // The same picks as the test above: the save refuses a scenario without them.
    state: {
      activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  const { ventureId } = (await saved.json()) as { ventureId: string };
  await page.goto(`/cockpit?venture=${ventureId}`);

  // A stage's own sources.
  await page.getByRole("button", { name: /^Sole Prop activation, / }).click();
  // The fold's summary reads "▸ Sources for this stage · 2".
  await page.locator("summary", { hasText: /Sources for this stage · \d+/ }).click();
  const sources = page.locator("details[open]").filter({ has: page.locator("summary", { hasText: "Sources for this stage" }) }).getByRole("listitem");
  expect(await sources.count()).toBeGreaterThan(0);
  for (const item of await sources.all()) {
    await expect(item).toContainText(/Read on \d{4}-\d{2}-\d{2}\. Who read it wasn't recorded\./i);
    await expect(item).not.toContainText(/Read by a person/i);
    await expect(item).not.toContainText(/verified/i);
  }

  // The playbook export, in the same words.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const markdown = page.locator("pre");
  await expect(markdown).toContainText("### Citations");
  await expect(markdown).toContainText(/ · Read on \d{4}-\d{2}-\d{2}\. Who read it wasn't recorded\./);
  await expect(markdown).toContainText(/sources_read_by_a_person: \d+ of \d+/);
  await expect(markdown).not.toContainText("· verified ");

  // The readout, for an agent: each citation carries the same words beside its dates.
  const readout = (await (await page.request.get(`/api/readout?venture=${ventureId}`)).json()) as {
    evaluation: { unlocks: { citations: { howChecked: string; lastVerified?: string; toolCheck?: { checkedOn: string } }[] }[] };
  };
  const citations = readout.evaluation.unlocks.flatMap((u) => u.citations);
  expect(citations.length).toBeGreaterThan(0);
  for (const c of citations) {
    expect([
      `Read by a person on ${c.lastVerified}`,
      `Read on ${c.lastVerified}. Who read it wasn't recorded.`,
      `Read by an AI model on ${c.lastVerified}. Not read by a person yet.`,
      // Since 2026-10-12 the GST/HST card's CRA page is checked by a tool (option B), not read.
      `Checked by a tool on ${c.toolCheck?.checkedOn}: it found on the page the exact words this entry relies on. Not read by a person yet.`,
    ]).toContain(c.howChecked);
  }
});

// 2026-10-11: the honest map. The GST/HST card quotes the CRA's two tests instead of a 70% line of
// DotAmi's own; Incorporating shows the federal and Alberta routes from their own pages and lights only
// from the person's own "I'd incorporate at $___"; Liability / SR&ED says which answer lit it.
test("the map quotes the CRA, shows both ways to incorporate, and lights Incorporating only from your own number", async ({ page }) => {
  // An invented Alberta idea: first-year estimate $25,000 (inside the old 70% band), third year $150,000.
  const scenario = {
    id: `honest-${Date.now()}`,
    profile: {
      name: "Invented — honest map test",
      type: "service",
      province: "AB",
      targetRevenueY1: 25_000,
      targetRevenueY3: 150_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "self-employed",
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
  const { ventureId } = (await saved.json()) as { ventureId: string };
  await page.goto(`/cockpit?venture=${ventureId}`);
  const stage = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}, `) });

  // $25,000 is under both CRA tests: the voluntary card nobody picked stays grey (the old 70% line lit it).
  await expect(stage("Voluntary GST registration")).toHaveAccessibleName(/, not on your path, doesn't apply as answered, opens detail$/);
  await expect(stage("Mandatory GST registration")).toHaveAccessibleName(/, default, check first, opens detail$/);
  await stage("Mandatory GST registration").click();
  const panel = page.getByRole("complementary").filter({ has: page.getByRole("heading", { name: "Mandatory GST registration" }) });
  await expect(panel.getByText("You exceed the $30,000 threshold in a single calendar quarter.").first()).toBeVisible();
  await expect(
    panel
      .getByText("You exceed the $30,000 threshold over the previous four (or fewer) consecutive calendar quarters (but not in a single calendar quarter).")
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/approach/i)).toHaveCount(0);

  // Liability / SR&ED says which answer lit it.
  await expect(page.getByText("your intake has the activity tag Software / SaaS", { exact: false }).first()).toBeVisible();

  // Incorporating: both routes, the federal fee read on its page, Alberta's fees as named blanks.
  await expect(stage("Incorporating")).toHaveAccessibleName("Incorporating, default, check first, opens detail");
  // A screen reader hears the card's reason line too, not only sighted people.
  await expect(stage("Incorporating")).toHaveAccessibleDescription(/^Check first: set your own number to see this light/);
  // The readout API says "default" where the map does, instead of a bare "decision".
  const readout = await page.request.get(`/api/readout?venture=${ventureId}`);
  expect(readout.ok()).toBe(true);
  const body = (await readout.json()) as { nodes: Record<string, unknown>[]; scenario: { state: Record<string, unknown> } };
  expect(body.nodes.find((n) => n.id === "stage-3a-incorporation-80k-net")?.chip).toBe("default");
  // Where a stage sits on the map, never a status the person didn't give (2026-10-24): no node has the map's
  // list name as `status` (it said "complete" of the baseline on every idea), and the idea carries no such lists.
  expect(body.nodes.find((n) => n.id === "stage-0-employee-apprentice-baseline")).toMatchObject({ chip: "starting-point", yourStatus: null });
  expect(body.nodes.filter((n) => "status" in n)).toEqual([]);
  expect(body.scenario.state).not.toHaveProperty("completedNodeIds");
  expect(body.scenario.state).not.toHaveProperty("activeNodeIds");
  await stage("Incorporating").click();
  const inc = page.getByRole("complementary").filter({ has: page.getByRole("heading", { name: "Incorporating" }) });
  await expect(inc.getByRole("heading", { name: "Federal (Corporations Canada)" })).toBeVisible();
  await expect(inc.getByRole("heading", { name: "Alberta (Corporate Registry)" })).toBeVisible();
  await expect(inc.getByText("It will cost $200 and will take 1 day.", { exact: false }).first()).toBeVisible();
  await expect(inc.getByText(/no amount read/i).first()).toBeVisible();
  // Each line says how its source was checked (option B): a tool found the words, no person read the page.
  await expect(inc.getByText(/^Checked by a tool on 2026-10-12: .* Not read by a person yet\.$/).first()).toBeVisible();

  // The person's own number lights it; DotAmi never does.
  const own = inc.getByLabel("I'd incorporate at");
  await expect(own).toHaveValue("");
  await own.fill("100000");
  await expect(stage("Incorporating")).toHaveAccessibleName("Incorporating, default, applies as answered, opens detail");
  await expect(page.getByText("reaches your own number ($100,000)", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/^Saved · /)).toBeVisible();

  // Kept with the idea: a fresh load shows the number and the same colour.
  await page.goto(`/cockpit?venture=${ventureId}`);
  await expect(stage("Incorporating")).toHaveAccessibleName("Incorporating, default, applies as answered, opens detail");
  await stage("Incorporating").click();
  await expect(page.getByLabel("I'd incorporate at")).toHaveValue("100000");
});

// 2026-10-11: a ride-share driver under $30,000 was told on a green card that most businesses "need not
// register yet"; the CRA says the $30,000 line doesn't apply to commercial ride-sharing.
test("a ride-share driver's map: GST/HST from the first paid ride, in the CRA's words", async ({ page }) => {
  // The CRA's own example driver: $10,000 from driving passengers in Ontario.
  const scenario = {
    id: `rideshare-${Date.now()}`,
    profile: {
      name: "Invented — ride-share test",
      type: "service",
      province: "ON",
      targetRevenueY1: 10_000,
      targetRevenueY3: 10_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "self-employed",
      hireFirst: false,
      activityTags: ["Ride-share or taxi driving"],
      stage: "idea",
    },
    state: {
      activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  const { ventureId } = (await saved.json()) as { ventureId: string };
  await page.goto(`/cockpit?venture=${ventureId}`);
  const stage = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}, `) });

  // Under $30,000, and still Mandatory GST registration applies, saying which answer lit it.
  await expect(stage("Mandatory GST registration")).toHaveAccessibleName(
    "Mandatory GST registration, default, applies as answered, opens detail",
  );
  await expect(stage("Mandatory GST registration")).toHaveAccessibleDescription(/Ride-share or taxi driving/);
  await expect(stage("Voluntary GST registration")).toHaveAccessibleName(/, check first, opens detail$/);

  await stage("Mandatory GST registration").click();
  const panel = page.getByRole("complementary").filter({ has: page.getByRole("heading", { name: "Mandatory GST registration" }) });
  await expect(
    panel
      .getByText("You must register for a GST/HST account the moment you start earning money from commercial ridesharing services.")
      .first(),
  ).toBeVisible();
  await expect(
    panel.getByText("The $30,000 small supplier threshold does not apply for commercial ridesharing services.").first(),
  ).toBeVisible();
  await expect(page.getByText(/need not register yet/i)).toHaveCount(0);
});

test("a stage change on the ideas page survives a reload", async ({ page }) => {
  await page.goto("/ventures");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) });
  const stage = card.getByRole("combobox").first();
  await expect(stage).toHaveValue("prototype");

  // The save is a PATCH to the server; start listening before the change so a fast reply
  // can't slip past, and wait for it rather than for a timer.
  const saved = page.waitForResponse(
    (r) => r.url().includes("/api/ventures/") && r.request().method() === "PATCH" && r.ok(),
  );
  await stage.selectOption("established");
  await saved;

  await page.reload();
  await expect(
    page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
      .getByRole("combobox")
      .first(),
  ).toHaveValue("established");
});

test("the settings page: every group, what's true today, every setting and its warning", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);

  for (const g of SETTING_GROUPS) {
    await expect(page.getByRole("heading", { name: g.title, level: 2 })).toBeVisible();
  }

  // "Today" is read from the running app: its data file is this run's throwaway database, and
  // with no model key (playwright.config.ts) the typed sentence never leaves the computer.
  const data = page.getByRole("region", { name: "Data and backups" });
  const filePath = data.locator("code").filter({ hasText: /e2e[\\/]dotami\.db$/ });
  await expect(filePath).toBeVisible();
  // [8i] Run from source there is no operating-system key store: the receipts aren't encrypted, and
  // the page says so rather than staying quiet (docs/architecture/expense-records.md § 9).
  await expect(data).toContainText("Receipts in this copy aren't encrypted.");
  await expect(data).toContainText("The desktop app encrypts them.");
  await expect(data).not.toContainText("Your receipt files are encrypted");
  // [8i] The same for the data file: a copy run from source keeps it plain, and says so and why.
  await expect(data).toContainText("This copy's data file isn't encrypted.");
  await expect(data).toContainText("The desktop app encrypts it.");
  await expect(data).not.toContainText("Your data file is encrypted");
  const privacy = page.getByRole("region", { name: "Privacy" });
  await expect(privacy).toContainText("DotAmi sends nothing off this computer.");
  await expect(privacy).not.toContainText("sent to Anthropic");
  // Run from source: the tools' own usage reports, which of them the project's commands switch off,
  // and the two that no script reaches.
  await expect(privacy).toContainText("switch both off");
  await expect(privacy).toContainText("NEXT_TELEMETRY_DISABLED=1");
  await expect(privacy).toContainText("CHECKPOINT_DISABLE=1");
  // The registry check is described like the update check: the address is seen, nothing else.
  await expect(privacy).toContainText("npm sees this computer's internet address");
  await expect(privacy).not.toContainText("npx next telemetry disable");

  // Every setting is listed with its default, its warning when it has one, and the story that
  // brings it — and nothing on the page pretends to be a control that works: the only controls are
  // the live settings' own (the three Figure reminders tick-boxes, tested below). [8i] "Encrypt the
  // data file" is live too, but run from source it offers no control: only the desktop app encrypts.
  for (const s of SETTINGS) {
    const row = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: s.label, level: 3, exact: true }) });
    await expect(row).toContainText(s.defaultValue);
    if (s.warning) await expect(row).toContainText(s.warning);
    if (s.status === "planned") await expect(row).toContainText(`Not built yet · [${s.story}]`);
    if (s.status === "asked") await expect(row).toContainText(`Asked each time · ${s.where}`);
  }
  await expect(page.locator("main").locator("select, textarea")).toHaveCount(0);
  const liveRows = SETTINGS.filter((s) => s.status === "live");
  expect(liveRows.map((s) => s.id)).toEqual(["database-encryption", "figure-reminders"]);
  await expect(
    page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Encrypt the data file", level: 3, exact: true }) }),
  ).toContainText("Only the desktop app encrypts the data file; this copy, run from source, can't.");
  await expect(page.locator("main").locator("input")).toHaveCount(3);
  await expect(
    page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Figure reminders", level: 3, exact: true }) })
      .getByRole("checkbox"),
  ).toHaveCount(3);

  // The receipt copies live beside the data file, so a copy of the file alone isn't all of it.
  await expect(data).toContainText("plus the copies of your receipts in a folder named receipts beside it");
  await expect(data).toContainText("Copying that file and the receipts folder beside it while DotAmi is stopped is a complete backup");
  await expect(data).not.toContainText("All of your data is one file");

  // The path button: the data file's path lands on the clipboard exactly as shown.
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await data.getByRole("button", { name: "Copy path" }).click();
  await expect(data.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await filePath.textContent());

  // A long path wraps on a phone-width window instead of pushing the page sideways.
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Reachable from the ideas page too.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/ventures");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("Licences: reached from the settings page, every package with its licence word for word", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("region", { name: "Updates" }).getByRole("link", { name: "Licences", exact: true }).click();
  await expect(page).toHaveURL(/\/licences$/);
  await expect(page.getByRole("heading", { name: /^Licences/, level: 1 })).toBeVisible();

  // The list `npm run build` wrote (desktop/notices.mjs) for this copy: DotAmi's dependencies with
  // their licences, the fonts, and the code bundled inside Next.js.
  const packages = page.getByRole("region", { name: "Packages" });
  const react = packages.getByRole("listitem").filter({ has: page.getByText("react", { exact: true }) });
  await expect(react).toContainText("MIT");
  // Closed until opened; opened, it shows where it ships and the licence's own words.
  await expect(react.getByText(/Permission is hereby granted/)).toBeHidden();
  await react.getByText("react", { exact: true }).click();
  await expect(react.getByText(/Permission is hereby granted/)).toBeVisible();
  await expect(react).toContainText("Ships in DotAmi's dependencies");
  for (const name of ["next", "pdfjs-dist", "ofx-js", "@prisma/client", "tailwindcss"]) {
    await expect(packages.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Fonts" })).toContainText("Inter (font)");
  await expect(page.getByRole("region", { name: "Copied inside other packages" })).toBeVisible();
  // A copy run from source doesn't carry Electron, so there is no runtime section.
  await expect(page.getByRole("region", { name: "The desktop app's runtime" })).toHaveCount(0);

  // Phone width: a long licence line wraps instead of pushing the page sideways.
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

/** The "Figure reminders" row on /settings, and its three tick-boxes. */
function reminderBoxes(page: Page) {
  const row = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Figure reminders", level: 3, exact: true }) });
  return {
    row,
    monthly: row.getByRole("checkbox", { name: "Monthly" }),
    quarterly: row.getByRole("checkbox", { name: "Quarterly" }),
    yearly: row.getByRole("checkbox", { name: "Yearly" }),
  };
}

/** Ticks or unticks one box and waits until the app has answered the save, so a reload straight after can't beat it. */
async function setBox(page: Page, box: Locator, on: boolean) {
  const answered = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/settings" && r.request().method() === "PUT");
  if (on) await box.check();
  else await box.uncheck();
  expect((await answered).status()).toBe(200);
}

/**
 * Puts the reminders setting back to "nothing ticked, no idea switched on, nothing dismissed", from inside the page. The
 * browser tests share one database, and CI retries a failed test once, so each reminders test starts
 * from a known state rather than from what an earlier attempt left behind.
 */
async function resetReminders(page: Page) {
  const status = await page.evaluate(async () => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "figure-reminders", value: { cadences: [], ideaIds: [], dismissed: [] } }),
    });
    return res.status;
  });
  expect(status).toBe(200);
}

/** What the app holds for the reminders setting, asked from inside the page (the routes answer only the app's own window). */
async function savedReminders(page: Page) {
  return page.evaluate(async () => {
    const res = await fetch("/api/settings?id=figure-reminders", { cache: "no-store" });
    return { status: res.status, body: await res.json() };
  });
}

test("Figure reminders: tick monthly and yearly, reload, and they are still ticked", async ({ page }) => {
  await page.goto("/settings");
  await resetReminders(page);
  await page.reload();
  const boxes = reminderBoxes(page);

  // Off until the person ticks something: nothing is ticked, and the row says so.
  await expect(boxes.monthly).toBeEnabled(); // the saved value has been read
  await expect(boxes.monthly).not.toBeChecked();
  await expect(boxes.quarterly).not.toBeChecked();
  await expect(boxes.yearly).not.toBeChecked();
  await expect(boxes.row).toContainText("None ticked: no reminder.");

  // Any combination: the first and the last, not the one between.
  await setBox(page, boxes.monthly, true);
  await expect(boxes.row.getByRole("status")).toHaveText("Saved.");
  await setBox(page, boxes.yearly, true);

  // A reload reads the choice back from the data file, not from the page's memory.
  await page.reload();
  await expect(boxes.monthly).toBeChecked();
  await expect(boxes.quarterly).not.toBeChecked();
  await expect(boxes.yearly).toBeChecked();
  expect(await savedReminders(page)).toMatchObject({ status: 200, body: { value: { cadences: ["monthly", "yearly"] } } });

  // Another page, then back: still there.
  await page.goto("/ventures");
  await page.goto("/settings");
  await expect(boxes.monthly).toBeChecked();
  await expect(boxes.yearly).toBeChecked();

  // Tick quarterly, leave by an in-app link and come back with the browser's Back button. Next can
  // bring the page back from memory, built with the list it had before quarterly was ticked. The
  // boxes must read what is saved, or the next tick would send that stale list and undo quarterly.
  await setBox(page, boxes.quarterly, true);
  await page.getByRole("link", { name: "← Back" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(boxes.monthly).toBeEnabled(); // the saved value has been read
  await expect(boxes.quarterly).toBeChecked();
  // The next tick keeps quarterly: it is still saved after unticking yearly.
  await setBox(page, boxes.yearly, false);
  expect(await savedReminders(page)).toMatchObject({ body: { value: { cadences: ["monthly", "quarterly"] } } });
  await setBox(page, boxes.yearly, true);
  await setBox(page, boxes.quarterly, false);

  // The settings can only be reached from DotAmi's own window — a program calling the route is refused.
  expect((await page.request.get("/api/settings?id=figure-reminders")).status()).toBe(403);
  expect(
    (await page.request.put("/api/settings", { data: { id: "figure-reminders", value: { cadences: ["quarterly"] } } })).status(),
  ).toBe(403);
  await page.reload();
  await expect(boxes.quarterly).not.toBeChecked();

  // Unticking is a choice too, and survives the same way. "None" is allowed.
  await setBox(page, boxes.monthly, false);
  await setBox(page, boxes.yearly, false);
  await page.reload();
  await expect(boxes.monthly).not.toBeChecked();
  await expect(boxes.yearly).not.toBeChecked();
  expect(await savedReminders(page)).toMatchObject({ body: { value: { cadences: [] } } });
});

test("Add to my calendar: the ticked boxes become a calendar file made in the page, with nothing sent", async ({ page }) => {
  // A fixed day, so the first event's date is known: October 8, 2026 (noon UTC is the 8th from
  // UTC-11 to UTC+11).
  await page.clock.install({ time: new Date("2026-10-08T12:00:00Z") });
  await page.goto("/settings");
  await resetReminders(page);
  await page.reload();
  const boxes = reminderBoxes(page);
  const button = boxes.row.getByRole("button", { name: "Add to my calendar" });
  await expect(boxes.monthly).toBeEnabled(); // the saved value has been read

  // Quarterly ticked: one repeating event, from the first day of the next quarter.
  await setBox(page, boxes.quarterly, true);
  await expect(button).toBeEnabled();
  await expect(boxes.row).toContainText("can't see DotAmi, so it reminds you whether or not your figures are already in");
  // Google Calendar takes a file only through its website's import page, not by opening the file.
  await expect(boxes.row).toContainText("Google Calendar: import it on a computer at calendar.google.com");
  await expect(boxes.row).toContainText("Importing the same file again adds a second copy");
  const seen = watchRequests(page);
  const download = page.waitForEvent("download");
  await button.click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("DotAmi figure reminders.ics");
  const text = (await readDownload(file)).toString("utf8");
  expect(text.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
  expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
  expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  // The UID is a random UUID (RFC 7986 §5.3), new for every file.
  const firstUid = text.match(/\r\nUID:(\S+)\r\n/)?.[1];
  expect(firstUid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(text).toContain("\r\nDTSTART;VALUE=DATE:20270101\r\n");
  expect(text).toContain("\r\nRRULE:FREQ=MONTHLY;INTERVAL=3\r\n");
  expect(text).toContain("\r\nSUMMARY:Bring your DotAmi figures up to date\r\n");
  // Nothing left the page to make it: no request at all after the click.
  expect(seen.map((r) => r.path)).toEqual([]);

  // Monthly and yearly instead: two events, in that order.
  await setBox(page, boxes.quarterly, false);
  await setBox(page, boxes.monthly, true);
  await setBox(page, boxes.yearly, true);
  const second = page.waitForEvent("download");
  await button.click();
  const both = (await readDownload(await second)).toString("utf8");
  expect([...both.matchAll(/\r\nRRULE:(\S+)\r\n/g)].map((m) => m[1])).toEqual(["FREQ=MONTHLY", "FREQ=YEARLY"]);
  // Three events across two files, three different UIDs: a second file never reuses one.
  const bothUids = [...both.matchAll(/\r\nUID:(\S+)\r\n/g)].map((m) => m[1]);
  expect(new Set([firstUid, ...bothUids]).size).toBe(3);
  expect(both).toContain("\r\nDTSTART;VALUE=DATE:20261101\r\n");

  // Nothing ticked: there is nothing to put in a calendar, so the button is off.
  await setBox(page, boxes.monthly, false);
  await setBox(page, boxes.yearly, false);
  for (const box of [boxes.monthly, boxes.quarterly, boxes.yearly]) await expect(box).not.toBeChecked();
  await expect(button).toBeDisabled();
  // Still off after a reload, where the line under the boxes says why.
  await page.reload();
  await expect(boxes.monthly).toBeEnabled(); // the saved value has been read
  await expect(boxes.row).toContainText("None ticked: no reminder.");
  await expect(button).toBeDisabled();
});

/** A download's bytes, read from where Playwright put it. */
async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test("Remind me about this idea: off until turned on, per idea, and still on after a reload", async ({ page }) => {
  await page.goto("/ventures");
  await resetReminders(page);
  await page.reload();
  const chinook = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
    .first();
  const salish = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: /^Demo — Salish/, level: 2 }) })
    .first();
  const switchOf = (card: Locator) => card.getByRole("switch", { name: "Remind me about this idea" });

  // Off for every idea until turned on.
  await expect(switchOf(chinook)).toBeEnabled();
  await expect(switchOf(chinook)).not.toBeChecked();
  await expect(switchOf(salish)).not.toBeChecked();

  // Turn one on: only that idea's switch changes, and it survives a reload.
  await switchOf(chinook).check();
  await expect(switchOf(chinook)).toBeChecked();
  await expect.poll(async () => (await savedReminders(page)).body.value.ideaIds.length).toBe(1);
  await page.reload();
  await expect(switchOf(chinook)).toBeChecked();
  await expect(switchOf(salish)).not.toBeChecked();

  // The ticks on the settings page and the switches on this page are one setting, and neither
  // page undoes the other's half.
  await page.goto("/settings");
  const boxes = reminderBoxes(page);
  await setBox(page, boxes.quarterly, true);
  await page.goto("/ventures");
  await expect(switchOf(chinook)).toBeChecked();
  await switchOf(salish).check();
  await expect.poll(async () => (await savedReminders(page)).body.value.ideaIds.length).toBe(2);
  expect((await savedReminders(page)).body.value.cadences).toEqual(["quarterly"]);
  await page.goto("/settings");
  await expect(boxes.quarterly).toBeChecked();

  // Turn them off again: both stay off after a reload, and the settings page's choice is untouched.
  await page.goto("/ventures");
  await switchOf(chinook).uncheck();
  await switchOf(salish).uncheck();
  await expect.poll(async () => (await savedReminders(page)).body.value.ideaIds.length).toBe(0);
  await page.reload();
  await expect(switchOf(chinook)).toBeEnabled(); // the saved value has been read
  await expect(switchOf(chinook)).not.toBeChecked();
  await expect(switchOf(salish)).not.toBeChecked();
  await page.goto("/settings");
  await setBox(page, boxes.quarterly, false);
});

/**
 * [8g] The e2e database, opened from the test itself. Nothing in the app can add a bank or card
 * account yet (the statement screen that asks is the next step, and the route refuses while the
 * setting is planned), so the test puts one in the file the way that screen will.
 */
async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").replace(/\\/g, "/");
  const db = createDatabaseClient({ url: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

test("Bank and card records: still planned with no switch; an account is listed with its day and can be taken back", async ({ page }) => {
  const row = () =>
    page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Bank and card records", level: 3, exact: true }) });

  // No account yet: the row is a plan, with its warning and no control at all.
  await page.goto("/settings");
  await expect(row()).toContainText("Not built yet · [8g]");
  await expect(row()).toContainText("Before DotAmi reads a bank or card statement");
  await expect(row().locator("input, button, select")).toHaveCount(0);

  // A program can't list or add accounts; even DotAmi's own page can't add one while the setting is planned.
  expect((await page.request.get("/api/figures/bank-sources")).status()).toBe(403);
  expect((await page.request.post("/api/figures/bank-sources", { data: { allow: "always", name: "Example chequing" } })).status()).toBe(403);
  const fromPage = await page.evaluate(async () => {
    const res = await fetch("/api/figures/bank-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allow: "always", name: "Example chequing" }),
    });
    return { status: res.status, body: (await res.json()) as { error: string } };
  });
  expect(fromPage).toEqual({ status: 409, body: { error: "Bank and card records is off in Settings, so no account can be added." } });

  // An account in the file, agreed to today: Settings lists it under its name, with the day.
  const agreed = new Date();
  const today = agreed.toLocaleDateString("en-CA");
  const account = await withE2eDb((db) => db.sourceAccount.create({ data: { name: "Example chequing", allowance: "always", agreedAt: agreed } }));
  try {
    await page.reload();
    const list = row().getByRole("region", { name: "Your bank and card accounts" });
    await expect(list).toContainText("Example chequing");
    await expect(list).toContainText(`Always allowed since ${today}`);
    // Still no switch: the only controls in the row are the account's own.
    await expect(row().locator("input, select")).toHaveCount(0);

    // Take back asks first; "Keep it" changes nothing.
    await list.getByRole("button", { name: "Take back Example chequing" }).click();
    const ask = list.getByRole("group", { name: "Take back Example chequing?" });
    await expect(ask).toContainText("Figures already read from it stay.");
    await ask.getByRole("button", { name: "Keep it" }).click();
    await expect(ask).toBeHidden();
    await expect(list).toContainText("Example chequing");

    // "Yes, take it back": gone from the list, and still gone after a reload.
    await list.getByRole("button", { name: "Take back Example chequing" }).click();
    const answered = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/figures/bank-sources/retire");
    await list.getByRole("group", { name: "Take back Example chequing?" }).getByRole("button", { name: "Yes, take it back" }).click();
    expect((await answered).status()).toBe(200);
    await expect(list.getByRole("status")).toHaveText("Taken back: Example chequing.");
    await expect(list).toContainText("No accounts in your list.");
    await page.reload();
    await expect(row()).toContainText("Not built yet · [8g]");
    await expect(row().getByRole("region", { name: "Your bank and card accounts" })).toHaveCount(0);
    // Taken back, not deleted: the row stays in the file, with the day, until Delete.
    const kept = await withE2eDb((db) => db.sourceAccount.findUnique({ where: { id: account.id } }));
    expect(kept?.retiredAt).not.toBeNull();
  } finally {
    await withE2eDb((db) => db.sourceAccount.deleteMany({ where: { id: account.id } }));
  }
});

test("a confirmed figure decides the GST card, with its source — and only the agree prompt confirms", async ({ page }) => {
  // The last complete calendar quarter before today, so the figure has ended and sits in the window.
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) - 1;
  if (quarter < 0) {
    quarter = 3;
    year -= 1;
  }
  const first = quarter * 3 + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(first)}-01`;
  const to = `${year}-${pad(first + 2)}-${new Date(Date.UTC(year, first + 2, 0)).getUTCDate()}`;
  const label = `${MONTHS[first - 1]} to ${MONTHS[first + 1]} ${year}`;

  await page.goto("/ventures");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
    .first();
  const ventureId = new URL((await card.getByRole("link", { name: /Open in cockpit/ }).getAttribute("href"))!, "http://x").searchParams.get("venture")!;

  // Type a figure: it goes through the same agree prompt as every other figure.
  await card.getByRole("button", { name: "Add a figure" }).click();
  await card.getByLabel("From", { exact: true }).fill(from);
  await card.getByLabel("To", { exact: true }).fill(to);
  await card.getByLabel("Amount", { exact: true }).fill("31,200");
  await card.getByRole("button", { name: "Review this figure" }).click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt).toBeVisible();
  // The reminder to check the work sits in the prompt, next to the Agree button.
  const checkFirst = prompt.getByText("Double-check what DotAmi did, and how, before you agree.", { exact: true });
  await expect(checkFirst).toBeVisible();

  // Closing the prompt confirms nothing.
  await page.keyboard.press("Escape");
  await expect(prompt).toBeHidden();
  const listed = async () => ((await (await page.request.get(`/api/figures?venture=${ventureId}`)).json()) as { figures: { id: string; status: string }[] }).figures;
  const [waiting] = await listed();
  expect(waiting.status).toBe("proposed");

  // Nothing but the app's own page can confirm: a script calling the API is refused, and the
  // route outside agents use can only propose.
  expect((await page.request.post("/api/figures/agree", { data: { ventureId, figureIds: [waiting.id] } })).status()).toBe(403);
  const sneaky = await page.request.post("/api/figures/propose", {
    data: {
      ventureId,
      source: { kind: "agent", label: "an agent" },
      figures: [{ kind: "gross-revenue", periodStart: from, periodEnd: to, amountCents: 100, currency: "CAD", status: "confirmed" }],
    },
  });
  expect(sneaky.status()).toBe(400);
  expect((await listed()).map((f) => f.status)).toEqual(["proposed"]);

  // The person agrees.
  await card.getByRole("button", { name: "Review" }).click();
  // ...and it is there every time the prompt opens, not only the first.
  await expect(checkFirst).toBeVisible();
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toBeHidden();
  expect((await listed()).map((f) => f.status)).toEqual(["confirmed"]);

  // The map's GST card now reads the person's own figure instead of the $45,000 estimate.
  await card.getByRole("link", { name: /Open in cockpit/ }).click();
  await page.getByRole("button", { name: /^Threshold: GST\/HST small-supplier threshold, / }).first().click();
  await expect(page.getByText(`Shown because your confirmed revenue for ${label} is $31,200 — over $30,000 in a single calendar quarter.`).first()).toBeVisible();
  await expect(page.getByText(/From your records · 1 figure · from typed by you/).first()).toBeVisible();
});

// ---- [8e] How old each figure is ------------------------------------------------------------
// Both use the invented venture "Demo — Chinook Sign Painting", through figures of their own, and
// run in British Columbia with the browser's clock set by the test. The server keeps its real
// clock, so a period that has ended for the server can still be after "today" for the page —
// exactly what a computer with a wrong clock looks like.
test.describe("how old each figure is", () => {
  test.use({ timezoneId: "America/Vancouver" });

  /** The Chinook card on /ventures, with its id-free helpers. */
  async function openChinook(page: Page) {
    await page.goto("/ventures");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
      .first();
    // The panel has loaded its figures once its add buttons are there.
    await expect(card.getByRole("button", { name: "Add a figure" })).toBeVisible();
    return card;
  }

  /** Types a figure into the add form and opens the agree prompt for it. */
  async function typeFigure(card: Locator, from: string, to: string, amount: string) {
    await card.getByRole("button", { name: "Add a figure" }).click();
    await card.getByLabel("From", { exact: true }).fill(from);
    await card.getByLabel("To", { exact: true }).fill(to);
    await card.getByLabel("Amount", { exact: true }).fill(amount);
    await card.getByRole("button", { name: "Review this figure" }).click();
  }

  test("each figure says how long ago it ended and the day you agreed, in your own day — 11:30 p.m. on March 31 in BC is still March", async ({
    page,
  }) => {
    // 06:30 UTC on April 1 is 11:30 p.m. on March 31 in Vancouver. Time flows from here, so the
    // test can run it past midnight below.
    await page.clock.install({ time: "2026-04-01T06:30:00Z" });
    // The agreed and retracted moments come from the server's clock, which is "now" for real.
    // Pin them to the same evening so the test checks the day the page works out for them (March
    // 31 in Vancouver) whatever hour it runs at — a UTC reading would say April 1.
    await page.route(/\/api\/figures\?venture=/, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch();
      const body = (await response.json()) as { figures?: { confirmedAt: string | null; retractedAt: string | null }[] };
      for (const f of body.figures ?? []) {
        if (f.confirmedAt) f.confirmedAt = "2026-04-01T06:30:00.000Z";
        if (f.retractedAt) f.retractedAt = "2026-04-01T06:30:00.000Z";
      }
      return route.fulfill({ status: response.status(), contentType: "application/json", body: JSON.stringify(body) });
    });

    const card = await openChinook(page);
    const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
    // A figure's row, found by its period written out in full ("March 2026"), so a quarter such as
    // "January to March 2026" from another test never answers to it.
    const row = (period: string) => card.getByRole("listitem").filter({ has: page.getByText(period, { exact: true }) });

    // March ends today: the agree prompt says so, and flags nothing.
    await typeFigure(card, "2026-03-01", "2026-03-31", "1,000");
    await expect(prompt).toContainText("ends today");
    await expect(prompt).not.toContainText("Check this date");
    await prompt.getByRole("button", { name: "Agree", exact: true }).click();
    await expect(prompt).toBeHidden();
    await expect(row("March 2026")).toContainText("ends today · agreed 2026-03-31");

    // April hasn't ended on this page's clock. The server accepts it (its clock is later), so it
    // can be agreed to — and it is flagged, in the prompt and in the list.
    await typeFigure(card, "2026-04-01", "2026-04-30", "500");
    await expect(prompt).toContainText("Check this date. This period ends after today (2026-04-30 is later than 2026-03-31)");
    await prompt.getByRole("button", { name: "Agree", exact: true }).click();
    await expect(prompt).toBeHidden();
    await expect(row("April 2026")).toContainText("ends next month · agreed 2026-03-31");
    await expect(row("April 2026")).toContainText("This period ends after today (2026-04-30 is later than 2026-03-31)");

    // The window stays open past midnight: nobody reloads, and "today" moves on by itself.
    await page.clock.runFor(31 * 60 * 1000);
    await expect(row("March 2026")).toContainText("ended yesterday · agreed 2026-03-31");
    await expect(row("March 2026")).not.toContainText("ends today");
    await expect(row("April 2026")).toContainText("This period ends after today (2026-04-30 is later than 2026-04-01)");

    // Retracting shows the person's day, not the UTC day the timestamp starts with.
    await row("March 2026").getByRole("button", { name: "Retract", exact: true }).click();
    await row("March 2026").getByRole("button", { name: "Retract", exact: true }).click();
    const retracted = card.getByRole("listitem").filter({ hasText: "retracted 2026-03-31" });
    await expect(retracted).toBeVisible();
    await expect(retracted).toContainText("ended yesterday · agreed 2026-03-31");
    await expect(card).not.toContainText("retracted 2026-04-01");
  });

  test("a figure dated after today is never counted by the GST card, which says how recent its figures are", async ({ page }) => {
    // Mid-February on the page's clock. A February figure of $31,200 sits in this quarter, and
    // before [8e] it was read as the quarter's revenue, so the card said "over $30,000 in a
    // single calendar quarter" from a figure that hadn't ended.
    await page.clock.install({ time: "2026-02-15T20:00:00Z" });
    const card = await openChinook(page);
    const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });

    await typeFigure(card, "2026-02-01", "2026-02-28", "31,200");
    await expect(prompt).toContainText("Check this date");
    await prompt.getByRole("button", { name: "Agree", exact: true }).click();
    await expect(prompt).toBeHidden();

    await card.getByRole("link", { name: /Open in cockpit/ }).click();
    await page.getByRole("button", { name: /^Threshold: GST\/HST small-supplier threshold, / }).first().click();

    // The card says what it left out and why, and what the figures it did read don't cover.
    await expect(
      page.getByText(/(One figure isn't|\d+ figures aren't) counted: it ends after today \(\d{4}-\d{2}-\d{2}\) — check its date/).first(),
    ).toBeVisible();
    await expect(page.getByText("October to December 2025 and 3 earlier quarters aren't fully covered yet.").first()).toBeVisible();
    // ...and never reads the future-dated figure as this quarter's revenue. (The card's own sentence is
    // matched, not the bare phrase: the CRA's test is quoted on the cards since 2026-10-11, and since
    // 2026-10-12 in the step panel's cited "done when" lines for GST, in the same words; neither is a reading.)
    await expect(page.getByText(/Shown because your confirmed revenue for .* over \$30,000 in a single calendar quarter/)).toHaveCount(0);
  });

  test("a map left open past midnight on a quarter's last day moves to the new four-quarter window without a reload", async ({
    page,
  }) => {
    // A June 2025 figure is older than every window below, before and after midnight, so the card
    // always lists it as "not read" and names the span it is reading. That span is the quarter
    // wording this test watches. (No other figure in this shared database starts before 2026.)
    // It is made on the real clock: it ended long ago for the server and the page alike.
    const card = await openChinook(page);
    const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
    await typeFigure(card, "2025-06-01", "2025-06-30", "1,200");
    await prompt.getByRole("button", { name: "Agree", exact: true }).click();
    await expect(prompt).toBeHidden();
    const cockpitPath = await card.getByRole("link", { name: /Open in cockpit/ }).getAttribute("href");
    expect(cockpitPath).toBeTruthy();

    // 06:59 UTC on October 1 is 11:59 p.m. on September 30 in Vancouver (daylight time, UTC-7):
    // the last minute of the third quarter. Installed after the figure is in, so the minute isn't
    // spent typing it. Time flows from here, which leaves the page about a minute before midnight.
    await page.clock.install({ time: "2026-10-01T06:59:00Z" });
    await page.goto(cockpitPath!);
    await page.getByRole("button", { name: /^Threshold: GST\/HST small-supplier threshold, / }).first().click();

    // The quarter we're in is July to September, so the four complete ones before it run from
    // July 2025 to June 2026.
    const before = page.getByText(
      /looks only at the last four complete calendar quarters \(July 2025 to June 2026\) and the current one/,
    );
    const after = page.getByText(
      /looks only at the last four complete calendar quarters \(October 2025 to September 2026\) and the current one/,
    );
    await expect(before.first()).toBeVisible();
    await expect(after).toHaveCount(0);

    // Past local midnight, with no reload: October begins, the current quarter is now October to
    // December, and the four complete quarters before it run from October 2025 to September 2026.
    await page.clock.runFor(2 * 60 * 1000);
    await expect(after.first()).toBeVisible();
    await expect(before).toHaveCount(0);
  });
});

// ---- [8f] The four T2125 totals ----------------------------------------------------------------
// On the invented venture "Demo — Chinook Sign Painting", after the figures tests above; the GST card's
// own figure is "gross-revenue", which these never touch. Amounts are invented.

test("Add a figure offers the four T2125 totals with their lines, asks the tax year, and says 'not read yet' for an unread year", async ({
  page,
}) => {
  await page.goto("/ventures");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
    .first();
  const ventureId = new URL((await card.getByRole("link", { name: /Open in cockpit/ }).getAttribute("href"))!, "http://x").searchParams.get("venture")!;
  type Listed = { id: string; kind: string; status: string; taxYear: number | null; formLine: string | null };
  const listed = async () => ((await (await page.request.get(`/api/figures?venture=${ventureId}`)).json()) as { figures: Listed[] }).figures;

  await card.getByRole("button", { name: "Add a figure" }).click();
  const what = card.getByLabel("What", { exact: true });
  // The list: revenue as before, then the four totals, each with the line it goes on.
  await expect(what.locator("option")).toHaveText([
    "Revenue (gross, before expenses)",
    "Business gross income (T2125), line 8299",
    "Business total expenses (T2125), line 9368",
    "Business net income before adjustments (T2125), line 9369",
    "Business net income (T2125), line 9946",
  ]);

  // A T2125 total asks for its tax year; the line it goes on depends on the year.
  await what.selectOption({ label: "Business gross income (T2125), line 8299" });
  const taxYear = card.getByLabel("Tax year", { exact: true });
  await expect(taxYear).toBeVisible();
  await expect(card.getByText("The tax year this total is for. The CRA line it goes on can change from one year's form to the next.")).toBeVisible();

  // A year nobody has read: "not read yet", and no borrowed line number.
  await taxYear.fill("2023");
  const unread = card.getByText(
    "2023: not read yet. DotAmi has read the CRA's T2125 for 2025 only, so this figure is kept with its tax year and no line number until that year's form is read.",
  );
  await expect(unread).toBeVisible();
  await expect(taxYear).toHaveAccessibleDescription(/not read yet/);

  // 2025 has been read: the line, the form's words for it and the day it was read.
  await taxYear.fill("2025");
  await expect(card.getByText(`Line 8299 on the CRA's 2025 T2125 ("Gross business or professional income"). Read by a person on 2026-10-10.`)).toBeVisible();
  await expect(unread).toHaveCount(0);

  // Dates from the wrong year: a period is filed for the year it ends in, so this is refused.
  await card.getByLabel("From", { exact: true }).fill("2024-01-01");
  await card.getByLabel("To", { exact: true }).fill("2024-12-31");
  await card.getByLabel("Amount", { exact: true }).fill("48,250");
  await card.getByRole("button", { name: "Review this figure" }).click();
  await expect(card.getByText(/This period ends in 2024, so it is a 2024 tax-year total, not 2025\./)).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Agree to these figures?" })).toHaveCount(0);

  await card.getByLabel("From", { exact: true }).fill("2025-01-01");
  await card.getByLabel("To", { exact: true }).fill("2025-12-31");
  await card.getByRole("button", { name: "Review this figure" }).click();

  // The agree prompt names the tax year and the line before anything is agreed.
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("Business gross income (T2125)");
  await expect(prompt).toContainText("tax year 2025 · T2125 line 8299");
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toBeHidden();

  // Kept with its tax year; typed, so there is no form line "as read".
  const gross = (await listed()).find((f) => f.kind === "business-gross-income")!;
  expect(gross).toMatchObject({ status: "confirmed", taxYear: 2025, formLine: null });
  await expect(card.getByText("tax year 2025 · T2125 line 8299")).toBeVisible();

  // A second total for a year nobody has read is kept too, and says so in the list.
  await card.getByRole("button", { name: "Add a figure" }).click();
  await card.getByLabel("What", { exact: true }).selectOption({ label: "Business net income (T2125), line 9946" });
  await card.getByLabel("Tax year", { exact: true }).fill("2023");
  await card.getByLabel("From", { exact: true }).fill("2023-01-01");
  await card.getByLabel("To", { exact: true }).fill("2023-12-31");
  await card.getByLabel("Amount", { exact: true }).fill("-1,200");
  await card.getByRole("button", { name: "Review this figure" }).click();
  await expect(prompt).toContainText("tax year 2023 · T2125 line not read yet");
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toBeHidden();
  await expect(card.getByText("tax year 2023 · T2125 line not read yet")).toBeVisible();
  expect((await listed()).find((f) => f.kind === "business-net-income")).toMatchObject({ status: "confirmed", taxYear: 2023, formLine: null });

  // Revenue has no tax year to ask: the field is there for a T2125 total and goes for revenue.
  await card.getByRole("button", { name: "Add a figure" }).click();
  await card.getByLabel("What", { exact: true }).selectOption({ label: "Business total expenses (T2125), line 9368" });
  await expect(card.getByLabel("Tax year", { exact: true })).toBeVisible();
  await card.getByLabel("What", { exact: true }).selectOption({ label: "Revenue (gross, before expenses)" });
  await expect(card.getByLabel("Amount", { exact: true })).toBeVisible();
  await expect(card.getByLabel("Tax year", { exact: true })).toHaveCount(0);
});

// ---- [8c] Add from a file -------------------------------------------------------------------
// All three use the invented venture "Demo — Salish Trail Maps" (the figures test above uses
// Chinook). Only the first one proposes anything for it; the other two prove their refusals and
// previews create nothing. Months are counted back from today, so the tests never go stale.

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The calendar month `n` months before the current one (n = 0 is this month; negative looks ahead). */
function monthsAgo(n: number): { y: number; m: number; name: string } {
  const now = new Date();
  const total = now.getFullYear() * 12 + now.getMonth() - n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, name: `${MONTH_NAMES[m - 1]} ${y}` };
}

const two = (n: number) => String(n).padStart(2, "0");

/** Opens /ventures and returns the Salish card with its id, and a way to list that idea's figures. */
async function openSalish(page: Page) {
  await page.goto("/ventures");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Salish Trail Maps", level: 2 }) })
    .first();
  const href = await card.getByRole("link", { name: /Open in cockpit/ }).getAttribute("href");
  const ventureId = new URL(href!, "http://x").searchParams.get("venture")!;
  const figures = async () =>
    (
      (await (await page.request.get(`/api/figures?venture=${ventureId}`)).json()) as {
        figures: {
          status: string;
          amountCents: number;
          sourceLabel: string;
          sourceRows: number | null;
          periodStart: string;
        }[];
      }
    ).figures;
  // The panel has loaded its figures once its add buttons are there.
  await expect(card.getByRole("button", { name: "Add from a file" })).toBeVisible();
  return { card, ventureId, figures };
}

/**
 * Answers the panel's first question ("Where is this file from?") with accounting software. Every
 * file starts here (the maintainer's decision of 2026-10-07), so every test that adds a file goes through this first.
 */
async function answerAccounting(card: Locator) {
  const panel = card.getByRole("group", { name: "Add from a file" });
  await expect(panel.getByText("Where is this file from?")).toBeVisible();
  await panel
    .getByRole("button", { name: "Accounting software or a spreadsheet you keep" })
    .click();
  await expect(card.getByRole("group", { name: "Drop a spreadsheet here" })).toBeVisible();
}

/** Every request the page makes from now on: where it went and what it carried. */
function watchRequests(page: Page) {
  const seen: { path: string; url: string; method: string; body: string | null }[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    seen.push({ path: url.pathname, url: r.url(), method: r.method(), body: r.postData() });
  });
  return seen;
}

/** Privacy: while a file is being read and previewed, the page talks only to its own code chunks and /api/figures. */
function expectNothingLeftThisPage(seen: ReturnType<typeof watchRequests>, secrets: string[]) {
  for (const r of seen) {
    expect(
      r.path.startsWith("/_next/static/") || r.path.startsWith("/api/figures"),
      `unexpected request to ${r.path}`,
    ).toBe(true);
    for (const secret of secrets) {
      expect(r.url, "a cell value in a URL").not.toContain(encodeURIComponent(secret));
      expect(r.url, "a cell value in a URL").not.toContain(secret);
      expect(r.body ?? "", "a cell value in a request body").not.toContain(secret);
    }
  }
}

test("a dropped CSV becomes monthly figures, waiting for the person to agree", async ({ page }) => {
  const { card, ventureId, figures } = await openSalish(page);
  expect(await figures()).toEqual([]);
  const seen = watchRequests(page);

  // An invented French export: UTF-8 BOM, semicolons, day-first dates (a day above 12 settles the
  // order, so nothing needs asking), "1 234,56" amounts, and the clutter real exports carry.
  const [a, b, c] = [monthsAgo(4), monthsAgo(3), monthsAgo(2)];
  const next = monthsAgo(-1);
  const lines: string[] = ["Date de facture;Client;Montant"];
  const add = (line: string) => lines.push(line) && lines.length; // the line's 1-based row number
  add(`15/${two(a.m)}/${a.y};Atelier Nord;1 234,56`);
  add(`20/${two(a.m)}/${a.y};Café Lune;500,00`);
  const blankRow = add(";;");
  add(`18/${two(b.m)}/${b.y};Boulangerie Ours;2 000,00`);
  add(`19/${two(b.m)}/${b.y};Atelier Nord;300,50`);
  add(`27/${two(b.m)}/${b.y};Café Lune;0,50`);
  const noteRow = add("Note: exported from Facturex;;");
  add(`25/${two(c.m)}/${c.y};Atelier Nord;99,99`);
  add(`28/${two(c.m)}/${c.y};Café Lune;0,01`);
  const totalRow = add("Total;;4 135,56");
  const futureRow = add(`15/${two(next.m)}/${next.y};Atelier Nord;10,00`);
  const file = {
    name: "factures-salish.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("\ufeff" + lines.join("\r\n") + "\r\n", "utf8"),
  };
  const secrets = ["Atelier", "Café", "Boulangerie", "Facturex", "1 234,56", "1234,56"];

  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await expect(
    card.getByText(
      "It's read here, on this computer, and never kept — only the monthly totals you agree to are saved.",
    ),
  ).toBeVisible();
  await card.getByLabel("Choose a file").setInputFiles(file);

  // The columns are guessed from the French names, and the person is told to check.
  await expect(
    card.getByText("DotAmi guessed these from the column names — check them."),
  ).toBeVisible();
  // Every file: DotAmi has only been tried on invented files shaped from each program's help pages.
  await expect(
    card.getByText(
      "Each accounting program's export was tested on files shaped from that program's help pages, not on real exports, so check the columns and totals.",
    ),
  ).toBeVisible();
  await expect(card.getByLabel("Column names are in row").locator("option:checked")).toHaveText(
    "Row 1",
  );
  await expect(card.getByLabel("Date column").locator("option:checked")).toHaveText(
    "A · Date de facture",
  );
  await expect(card.getByLabel("Amount column (revenue)").locator("option:checked")).toHaveText(
    "C · Montant",
  );
  await expect(card.getByLabel("Amounts are written").locator("option:checked")).toHaveText(
    "1 234,56",
  );
  await expect(
    card.getByText("If the file also has a tax column, check whether this one includes the tax."),
  ).toBeVisible();
  await expect(card.getByLabel("Dates are written")).toHaveCount(0);

  // One total and row count per month, then everything left out and why.
  const table = card.getByRole("table", { name: "Monthly totals from factures-salish.csv" });
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(
    table.getByRole("row", { name: new RegExp(`^${a.name} \\$1,734\\.56 2 rows$`) }),
  ).toBeVisible();
  await expect(
    table.getByRole("row", { name: new RegExp(`^${b.name} \\$2,301\\.00 3 rows$`) }),
  ).toBeVisible();
  await expect(
    table.getByRole("row", { name: new RegExp(`^${c.name} \\$100\\.00 2 rows$`) }),
  ).toBeVisible();
  // How the dates were read, in words, for the person to check: the row in a month not over yet
  // adds nothing but its date was read, so it is the latest.
  await expect(
    card.getByText(
      `Dates read: 15 ${a.name} to 15 ${next.name}. Check these against the file's earliest and latest dates.`,
    ),
  ).toBeVisible();
  await expect(card.getByText(`1 blank row: row ${blankRow}`)).toBeVisible();
  await expect(
    card.getByText(`1 row without a date DotAmi can read: row ${noteRow}`),
  ).toBeVisible();
  await expect(
    card.getByText(`1 row that is a totals row (the file's own sum): row ${totalRow}`),
  ).toBeVisible();
  await expect(
    card.getByText(`1 row in a month that isn't over yet: row ${futureRow}`),
  ).toBeVisible();

  // Reading and previewing touched nothing but the page's own code and /api/figures, and sent no body.
  expectNothingLeftThisPage(seen, secrets);
  expect(seen.filter((r) => r.body !== null)).toEqual([]);
  expect(await figures()).toEqual([]);

  // Review: only the totals go to the server — no cell, no client name, no file content. The
  // dates are confirmed first; ticking the box sends nothing either.
  await card.getByRole("checkbox", { name: "These dates are right" }).check();
  expect(seen.filter((r) => r.body !== null)).toEqual([]);
  await card.getByRole("button", { name: "Review these 3 figures" }).click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt).toBeVisible();
  const proposals = seen.filter((r) => r.path === "/api/figures/propose");
  expect(proposals).toHaveLength(1);
  expect(JSON.parse(proposals[0].body!)).toEqual({
    ventureId,
    source: { kind: "file", label: "factures-salish.csv", rows: 7 },
    figures: [
      {
        kind: "gross-revenue",
        periodStart: `${a.y}-${two(a.m)}-01`,
        periodEnd: `${a.y}-${two(a.m)}-${new Date(Date.UTC(a.y, a.m, 0)).getUTCDate()}`,
        amountCents: 173456,
        currency: "CAD",
        rows: 2,
      },
      {
        kind: "gross-revenue",
        periodStart: `${b.y}-${two(b.m)}-01`,
        periodEnd: `${b.y}-${two(b.m)}-${new Date(Date.UTC(b.y, b.m, 0)).getUTCDate()}`,
        amountCents: 230100,
        currency: "CAD",
        rows: 3,
      },
      {
        kind: "gross-revenue",
        periodStart: `${c.y}-${two(c.m)}-01`,
        periodEnd: `${c.y}-${two(c.m)}-${new Date(Date.UTC(c.y, c.m, 0)).getUTCDate()}`,
        amountCents: 10000,
        currency: "CAD",
        rows: 2,
      },
    ],
  });
  expectNothingLeftThisPage(seen, secrets);

  // The agree prompt lists the months under the file's name; nothing is confirmed until Agree.
  await expect(prompt.getByRole("region", { name: "From factures-salish.csv" })).toContainText(
    a.name,
  );
  await expect(prompt.getByRole("region", { name: "From factures-salish.csv" })).toContainText(
    c.name,
  );
  expect((await figures()).map((f) => f.status)).toEqual(["proposed", "proposed", "proposed"]);
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toBeHidden();

  // The ideas card lists each figure with where it came from and how many rows made it.
  await expect(card.getByText("from factures-salish.csv · 2 rows")).toHaveCount(2);
  await expect(card.getByText("from factures-salish.csv · 3 rows")).toHaveCount(1);
  expect((await figures()).map((f) => f.status)).toEqual(["confirmed", "confirmed", "confirmed"]);
  expectNothingLeftThisPage(seen, secrets);
  expect(
    seen
      .filter((r) => r.body !== null)
      .map((r) => r.path)
      .sort(),
  ).toEqual(["/api/figures/agree", "/api/figures/propose"]);

  // Dropping the same file again (a real drop this time): the months are already here.
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  const dropped = await page.evaluateHandle(
    ({ name, text }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([text], name, { type: "text/csv" }));
      return transfer;
    },
    { name: file.name, text: file.buffer.toString("utf8") },
  );
  await card
    .getByRole("group", { name: "Drop a spreadsheet here" })
    .dispatchEvent("drop", { dataTransfer: dropped });
  await expect(card.getByText("Nothing new to propose from this file.")).toBeVisible();
  await expect(
    card.getByText(`${a.name} — already in DotAmi with the same total, not proposed again`),
  ).toBeVisible();
  await expect(
    card.getByText(`${b.name} — already in DotAmi with the same total, not proposed again`),
  ).toBeVisible();
  await expect(
    card.getByText(`${c.name} — already in DotAmi with the same total, not proposed again`),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);
  await card.getByRole("button", { name: "Cancel" }).click();
  await expect(card.getByRole("button", { name: "Add from a file" })).toBeVisible();
  expect(await figures()).toHaveLength(3);
});

// A gap the practice files found (2026-10-08), now fixed: this was a test.fail() pin until the
// screen named the report to export instead (the maintainer's decision, 2026-10-07).
test("Wave's Income by Customer, which has no dates, is met with the report to export instead", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const incomeByCustomer = waveFiles.find((f) => f.id === "wave-income-by-customer")!;
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: incomeByCustomer.fileName,
    mimeType: "text/csv",
    buffer: Buffer.from(incomeByCustomer.bytes()),
  });
  // Today's screen, positively first: the file is read and no column names are found.
  await expect(
    card.getByText("DotAmi couldn't find a row of column names in the first 30 rows."),
  ).toBeVisible();
  // The screen names Account Transactions, the Wave report that has a date on every line.
  await expect(
    card.getByText(
      "This looks like Wave's Income by Customer report: one total per customer, with no dates, so DotAmi can't split it into months. In Wave, export the Account Transactions report for your income account instead (Reports, Account Transactions, Export, as CSV): it has a date on every line.",
    ),
  ).toBeVisible();
  // The layout stays "one row per sale", and nothing can be reviewed.
  await expect(card.getByLabel("The file has").locator("option:checked")).toHaveText(
    "One row per sale, with a date",
  );
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);
  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

// Two gaps the practice files found (2026-10-08), now fixed (the maintainer's decision, 2026-10-07:
// every gap is fixed). Both files are invented, shaped from the vendors' help pages.
test("a French Sage 50 file with several amount columns reads on its semicolons", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const french = sage50Files.find((f) => f.id === "sage50-french")!;
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: french.fileName,
    mimeType: "text/csv",
    buffer: Buffer.from(french.bytes()),
  });
  // The French column names are found and Revenu is the amount: the lines were split on their
  // semicolons, not on the commas inside "1 000,00".
  await expect(card.getByLabel("Column names are in row").locator("option:checked")).toHaveText(
    "Row 5",
  );
  await expect(card.getByLabel("Amount column (revenue)").locator("option:checked")).toHaveText(
    "E · Revenu",
  );
  await expect(card.getByLabel("Amounts are written").locator("option:checked")).toHaveText(
    "1 234,56",
  );
  const table = card.getByRole("table", { name: `Monthly totals from ${french.fileName}` });
  await expect(table.getByRole("row", { name: /^July 2026 \$1,134\.56 2 rows$/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /^August 2026 \$420\.00 2 rows$/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /^September 2026 \$75\.25 1 row$/ })).toBeVisible();
  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("an Excel formula with no saved value is named as one, not as an empty amount", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const detail = xeroFiles.find((f) => f.id === "xero-receivable-invoice-detail")!;
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: detail.fileName,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(detail.bytes()),
  });
  const table = card.getByRole("table", { name: `Monthly totals from ${detail.fileName}` });
  await expect(table.getByRole("row", { name: /^July 2026 \$350\.00 2 rows$/ })).toBeVisible();
  // Row 9's line amount is a formula Excel never worked out: said so, with what to do.
  await expect(
    card.getByText(
      "1 row with a formula Excel didn't save a value for (open the file in Excel, click Enable Editing if it asks, save it, then drop it here again): row 9",
    ),
  ).toBeVisible();
  await expect(card.getByText(/with a date but no amount/)).toHaveCount(0);
  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("a report with the months across the top: one total per month column, from every row or the Total row", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const seen = watchRequests(page);

  // The invented FreshBooks-shaped Revenue by Client: clients down the side, July to September
  // 2026 across the top, a Total column and the report's own Total row.
  const revenue = freshbooksFiles.find((f) => f.id === "freshbooks-revenue-by-client")!;
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: revenue.fileName,
    mimeType: "text/csv",
    buffer: Buffer.from(revenue.bytes()),
  });

  // The screen starts on months across, with the row of month names guessed for the person to check.
  await expect(card.getByLabel("The file has").locator("option:checked")).toHaveText(
    "Months across the top, one column per month",
  );
  await expect(card.getByText("DotAmi guessed the row of month names — check it.")).toBeVisible();
  await expect(card.getByLabel("Month names are in row").locator("option:checked")).toHaveText(
    "Row 4",
  );
  await expect(card.getByText("B · July 2026")).toBeVisible();
  await expect(card.getByText("D · September 2026")).toBeVisible();
  await expect(card.getByText("Not months, so not added: A · Client, E · Total")).toBeVisible();
  // The row-per-sale pickers are not on screen in this layout.
  await expect(card.getByLabel("Date column")).toHaveCount(0);

  // Every row added down each month: three rows a month, and the Total row left out.
  const totalsFrom = card.getByLabel("Totals come from");
  await expect(totalsFrom.locator("option:checked")).toHaveText("Every row, added down each month");
  const table = card.getByRole("table", { name: `Monthly totals from ${revenue.fileName}` });
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table.getByRole("row", { name: /^July 2026 \$500\.00 3 rows$/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /^August 2026 \$476\.19 3 rows$/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /^September 2026 \$300\.00 3 rows$/ })).toBeVisible();
  await expect(
    card.getByText(
      "Months read from the column names: July 2026 to September 2026. Check these against the file.",
    ),
  ).toBeVisible();
  await expect(
    card.getByText("1 row that is a totals row (the file's own sum): row 8"),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: "Review these 3 figures" })).toBeVisible();

  // Only the report's Total row: the same months, one row each, and nothing left out.
  await totalsFrom.selectOption({ label: "Row 8 only · Total" });
  await expect(table.getByRole("row", { name: /^July 2026 \$500\.00 1 row$/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /^August 2026 \$476\.19 1 row$/ })).toBeVisible();
  await expect(card.getByText("Left out", { exact: true })).toHaveCount(0);

  // The wrong row of month names says so, and adds nothing up.
  await card.getByLabel("Month names are in row").selectOption({ label: "Row 1" });
  await expect(
    card.getByText(
      "No column in row 1 is named like a month and year (Jul 2026, juillet 2026, 2026-07 or 07/2026). Pick the row with the month names.",
    ),
  ).toBeVisible();
  await expect(card.getByRole("table")).toHaveCount(0);

  // Reading the file sent nothing.
  expectNothingLeftThisPage(seen, ["Invented Client", "476.19", "476,19"]);
  expect(seen.filter((r) => r.body !== null)).toEqual([]);

  // Back to the right row: every row again, and Review proposes the three months.
  await card.getByLabel("Month names are in row").selectOption({ label: "Row 4" });
  await expect(table.getByRole("row", { name: /^July 2026 \$500\.00 3 rows$/ })).toBeVisible();
  // Across the top, the months are what the person confirms.
  const monthsRight = card.getByRole("checkbox", { name: "These months are right" });
  await expect(monthsRight).not.toBeChecked();
  await expect(card.getByRole("button", { name: "Review these 3 figures" })).toBeDisabled();
  await monthsRight.check();
  await card.getByRole("button", { name: "Review these 3 figures" }).click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  const fromFile = prompt.getByRole("region", { name: `From ${revenue.fileName}` });
  await expect(fromFile).toContainText("July 2026");
  await expect(fromFile).toContainText("September 2026");
  // One client row goes into every month, so adding the months' row counts would say "9 rows"
  // for a file of 3 clients. No row count is sent for this layout, so none is shown.
  const proposals = seen.filter((r) => r.path === "/api/figures/propose");
  expect(proposals).toHaveLength(1);
  const sent = JSON.parse(proposals[0].body!) as {
    source: Record<string, unknown>;
    figures: Record<string, unknown>[];
  };
  expect(sent.source).toEqual({ kind: "file", label: revenue.fileName });
  expect(sent.figures.map((f) => [f.periodStart, f.amountCents, "rows" in f])).toEqual([
    ["2026-07-01", 50000, false],
    ["2026-08-01", 47619, false],
    ["2026-09-01", 30000, false],
  ]);
  await expect(fromFile.getByText(`From ${revenue.fileName}`, { exact: true })).toBeVisible();
  await expect(prompt.getByText(/\d+ rows?/)).toHaveCount(0);
  expectNothingLeftThisPage(seen, ["Invented Client", "476.19", "476,19"]);

  // Turning them down keeps nothing.
  await prompt.getByRole("button", { name: "No, I'll do it myself" }).click();
  await expect(prompt).toBeHidden();
  expect(await figures()).toEqual(before);
});

test("a month name DotAmi can't be sure of stops the table, naming the column", async ({ page }) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  // "Aug 26" could be August 2026 or the 26th of August: never guessed. Invented amounts.
  const lines = ["Client,Jul 2026,Aug 26", "Client A,100.00,50.00"];
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "short-month.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n") + "\n", "utf8"),
  });
  // No row is guessed (its names aren't all clear), so the person switches and picks the row.
  await card.getByLabel("The file has").selectOption("across");
  await expect(
    card.getByText("DotAmi couldn't find a row of month names in the first 30 rows."),
  ).toBeVisible();
  await card.getByLabel("Month names are in row").selectOption({ label: "Row 1" });
  await expect(
    card.getByText(
      "The name of column C looks like a month, but DotAmi can't be sure which month and year it is, so nothing is added up. It reads names like Jul 2026, juillet 2026, 2026-07 or 07/2026.",
    ),
  ).toBeVisible();
  await expect(card.getByRole("table")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);
  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("dates that read two ways are asked about once, and nothing is totalled until then", async ({ page }) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();

  // 04/09/2025 is 4 September day first and April 9 month first; no date in this file settles it.
  const target = monthsAgo(9);
  const day = target.m === 4 ? 5 : 4;
  const lines = [
    "Date,Customer,Amount",
    `${two(day)}/${two(target.m)}/${target.y},Client A,100.00`,
    `${two(day + 1)}/${two(target.m)}/${target.y},Client B,50.00`,
  ];
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "two-ways.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n") + "\n", "utf8"),
  });

  const order = card.getByLabel("Dates are written");
  await expect(order).toBeVisible();
  await expect(order).toHaveValue("");
  await expect(card.getByText("Say how the dates are written to see the totals.")).toBeVisible();
  await expect(card.getByRole("table")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);

  await order.selectOption("dmy");
  const table = card.getByRole("table", { name: "Monthly totals from two-ways.csv" });
  await expect(table.getByRole("row")).toHaveCount(1);
  await expect(table.getByRole("row", { name: new RegExp(`^${target.name} \\$150\\.00 2 rows$`) })).toBeVisible();

  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("a file with two-digit years asks once which century, then shows how the dates were read", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();

  // dd.mm.yy, one of FreshBooks' date formats. 18 can only be a day, so the order needs no
  // question; the century does. Invented clients and amounts.
  const [a, b] = [monthsAgo(3), monthsAgo(2)];
  const yy = (y: number) => String(y).slice(2);
  const lines = [
    "Invoice Date,Client,Amount",
    `18.${two(a.m)}.${yy(a.y)},Client A,100.00`,
    `18.${two(b.m)}.${yy(b.y)},Client B,50.00`,
  ];
  const file = {
    name: "short-years.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n") + "\n", "utf8"),
  };
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles(file);

  // The columns are still found, and the one question is asked instead of refusing the file.
  await expect(card.getByLabel("Date column").locator("option:checked")).toHaveText(
    "A · Invoice Date",
  );
  const century = card.getByLabel(`Is ${yy(a.y)} the year 20${yy(a.y)}?`);
  await expect(century).toBeVisible();
  await expect(century).toHaveValue("");
  await expect(
    card.getByText("This file writes years with two digits. Your answer is used for every date written that way in this column, for this file only."),
  ).toBeVisible();
  await expect(card.getByText(`Say which year ${yy(a.y)} is to see the totals.`)).toBeVisible();
  await expect(card.getByLabel("Dates are written")).toHaveCount(0);
  await expect(card.getByRole("table")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);

  // Yes: the dates are read in the 2000s, and the screen says how, in words.
  await century.selectOption("2000");
  const table = card.getByRole("table", { name: "Monthly totals from short-years.csv" });
  await expect(table.getByRole("row", { name: new RegExp(`^${a.name} \\$100\\.00 1 row$`) })).toBeVisible();
  await expect(table.getByRole("row", { name: new RegExp(`^${b.name} \\$50\\.00 1 row$`) })).toBeVisible();
  await expect(
    card.getByText(
      `Dates read: 18 ${a.name} to 18 ${b.name}. Check these against the file's earliest and latest dates.`,
    ),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: "Review these 2 figures" })).toBeVisible();
  const datesRight = card.getByRole("checkbox", { name: "These dates are right" });
  await datesRight.check();
  await expect(card.getByRole("button", { name: "Review these 2 figures" })).toBeEnabled();

  // No: the same rows land a hundred years earlier, and the sentence shows it at once. The dates
  // changed, so the tick is taken away.
  await century.selectOption("1900");
  const old = (m: { y: number; m: number }) => `${MONTH_NAMES[m.m - 1]} ${m.y - 100}`;
  await expect(table.getByRole("row", { name: new RegExp(`^${old(a)} \\$100\\.00 1 row$`) })).toBeVisible();
  await expect(
    card.getByText(
      `Dates read: 18 ${old(a)} to 18 ${old(b)}. Check these against the file's earliest and latest dates.`,
    ),
  ).toBeVisible();
  await expect(datesRight).not.toBeChecked();
  await expect(card.getByRole("button", { name: "Review these 2 figures" })).toBeDisabled();

  // The answer covers this file only: the same file again is asked again.
  await card.getByRole("button", { name: "Cancel" }).click();
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles(file);
  await expect(century).toBeVisible();
  await expect(century).toHaveValue("");
  await expect(card.getByRole("table")).toHaveCount(0);

  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("Review waits for 'These dates are right', and changing the date order or the file takes the tick away", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const seen = watchRequests(page);

  // 04/08/2025 and 05/08/2025 read two ways, and nothing in the file settles it. Over a year ago,
  // so both readings land in months that are over and both show totals. Invented clients.
  const target = monthsAgo(14);
  const day = target.m === 4 ? 5 : 4;
  const lines = [
    "Date,Customer,Amount",
    `${two(day)}/${two(target.m)}/${target.y},Client A,100.00`,
    `${two(day + 1)}/${two(target.m)}/${target.y},Client B,50.00`,
  ];
  const file = {
    name: "confirm-dates.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n") + "\n", "utf8"),
  };
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles(file);
  const order = card.getByLabel("Dates are written");
  await order.selectOption("dmy");

  // Day first: the totals and how the dates were read are on screen, with the box beside them,
  // empty, and Review can't be pressed until it is ticked.
  const table = card.getByRole("table", { name: "Monthly totals from confirm-dates.csv" });
  await expect(table.getByRole("row", { name: new RegExp(`^${target.name} \\$150\\.00 2 rows$`) })).toBeVisible();
  const dayFirst = `Dates read: ${day} ${target.name} to ${day + 1} ${target.name}. Check these against the file's earliest and latest dates.`;
  await expect(card.getByText(dayFirst)).toBeVisible();
  const datesRight = card.getByRole("checkbox", { name: "These dates are right" });
  await expect(datesRight).toBeVisible();
  await expect(datesRight).not.toBeChecked();
  // The box is described by the sentence it confirms.
  await expect(datesRight).toHaveAccessibleDescription(dayFirst);
  // Both rows are in one month day first, so one figure.
  const review = card.getByRole("button", { name: "Review this figure" });
  await expect(review).toBeVisible();
  await expect(review).toBeDisabled();
  await expect(card.getByText(`Tick "These dates are right" once they match the file.`)).toBeVisible();
  await expect(review).toHaveAccessibleDescription(`Tick "These dates are right" once they match the file.`);

  // Ticked: Review can be pressed, and the reminder goes.
  await datesRight.check();
  await expect(review).toBeEnabled();
  await expect(card.getByText(`Tick "These dates are right" once they match the file.`)).toHaveCount(0);

  // The currency never moves a date, so retyping it leaves the tick alone, even though the totals
  // (and the "Dates read" line with them) go away while it is only "U" or "US".
  const currency = card.getByLabel("Currency");
  for (const code of ["USD", "CAD"]) {
    await currency.fill("");
    await currency.pressSequentially(code);
    await expect(currency).toHaveValue(code);
    await expect(card.getByText(dayFirst)).toBeVisible();
    await expect(datesRight).toBeChecked();
    await expect(review).toBeEnabled();
  }

  // Month first: other dates, so the tick is taken away and Review is shut again.
  await order.selectOption("mdy");
  const monthFirst = `Dates read: ${target.m} ${MONTH_NAMES[day - 1]} ${target.y} to ${target.m} ${MONTH_NAMES[day]} ${target.y}. Check these against the file's earliest and latest dates.`;
  await expect(card.getByText(monthFirst)).toBeVisible();
  await expect(datesRight).not.toBeChecked();
  await expect(card.getByRole("button", { name: /^Review these \d+ figures$/ })).toBeDisabled();

  // Back to day first: the box stays empty; the dates changed on screen, so they are looked at again.
  await order.selectOption("dmy");
  await expect(card.getByText(dayFirst)).toBeVisible();
  await expect(datesRight).not.toBeChecked();
  await expect(review).toBeDisabled();

  // Nothing was sent while the box went on and off.
  expect(seen.filter((r) => r.body !== null)).toEqual([]);

  // The same file again, after Cancel, starts with the box empty: the tick was for that reading of
  // that file. (Cancel forgets the tick by itself; the file counter in the key covers the same case
  // in the unit tests.)
  await datesRight.check();
  await expect(review).toBeEnabled();
  await card.getByRole("button", { name: "Cancel" }).click();
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles(file);
  await order.selectOption("dmy");
  await expect(card.getByText(dayFirst)).toBeVisible();
  await expect(datesRight).not.toBeChecked();
  await expect(review).toBeDisabled();

  // Ticked, Review opens the agree prompt; turning it down keeps nothing.
  await datesRight.check();
  await review.click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt).toBeVisible();
  expect(seen.filter((r) => r.path === "/api/figures/propose")).toHaveLength(1);
  await prompt.getByRole("button", { name: "No, I'll do it myself" }).click();
  await expect(prompt).toBeHidden();
  expect(await figures()).toEqual(before);
});

test("a QuickBooks-shaped list: the Type column is pre-filled and the payment is left out, not counted as a second sale", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();

  // A Transaction List holds an invoice AND the payment received for it (invented numbers). Added
  // up as it stands the month would read $1,200.00; the sales are $700.00.
  const month = monthsAgo(3);
  const day = (d: number) => `${month.y}-${two(month.m)}-${two(d)}`;
  const lines = [
    "Date,Transaction Type,Num,Name,Amount",
    `${day(14)},Invoice,1040,Invented Client A,500.00`,
    `${day(20)},Payment,3456,Invented Client A,500.00`,
    `${day(28)},Sales Receipt,1046,Invented Client B,200.00`,
  ];
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "transaction-list.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n") + "\n", "utf8"),
  });

  // The Type column is filled from its exact header, along with the date and the amount.
  const type = card.getByLabel("Type column (optional)");
  await expect(type.locator("option:checked")).toHaveText("B · Transaction Type");
  await expect(card.getByLabel("Date column").locator("option:checked")).toHaveText("A · Date");
  await expect(card.getByLabel("Amount column (revenue)").locator("option:checked")).toHaveText(
    "E · Amount",
  );

  // The month counts the invoice and the sales receipt; the payment is listed with its reason.
  const table = card.getByRole("table", { name: "Monthly totals from transaction-list.csv" });
  await expect(table.getByRole("row")).toHaveCount(1);
  await expect(
    table.getByRole("row", { name: new RegExp(`^${month.name} \\$700\\.00 2 rows$`) }),
  ).toBeVisible();
  await expect(
    card.getByText(
      "1 row typed Payment or Deposit, left out because a Type column is chosen (in QuickBooks that is money received for a sale listed on another row; if it is a sale of yours, choose None): row 3",
    ),
  ).toBeVisible();

  // Clearing the select counts every row again, as before, and says nothing is left out.
  await type.selectOption("");
  await expect(
    table.getByRole("row", { name: new RegExp(`^${month.name} \\$1,200\\.00 3 rows$`) }),
  ).toBeVisible();
  await expect(card.getByText(/left out because a Type column is chosen/)).toHaveCount(0);
  await expect(card.getByText("Left out", { exact: true })).toHaveCount(0);

  // Choosing the column again leaves the payment out again.
  await type.selectOption({ label: "B · Transaction Type" });
  await expect(
    table.getByRole("row", { name: new RegExp(`^${month.name} \\$700\\.00 2 rows$`) }),
  ).toBeVisible();

  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("an invoice list with a summary on top: the real column names are found, and void and draft rows are left out", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();

  // FreshBooks-shaped (invented numbers): a title, a short summary of two titles over two figures,
  // then the table. One invoice is a Draft and one is Void; the issued invoices come to $500.00.
  const month = monthsAgo(3);
  const day = (d: number) => `${month.y}-${two(month.m)}-${two(d)}`;
  const lines = [
    "Invoice Details",
    "Total Invoiced,Total Paid",
    "500.00,500.00",
    "",
    "Client,Invoice Number,Issue Date,Status,Subtotal",
    `Invented Client A,0000001,${day(6)},Paid,400.00`,
    `Invented Client B,0000002,${day(14)},Draft,250.00`,
    `Invented Client C,0000003,${day(21)},Void,80.00`,
    `Invented Client B,0000004,${day(27)},Paid,100.00`,
  ];
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "invoice_details.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n") + "\n", "utf8"),
  });

  // The column names are found on row 5, under the summary, and the Status column is pre-filled.
  await expect(card.getByLabel("Column names are in row").locator("option:checked")).toHaveText(
    "Row 5",
  );
  await expect(card.getByLabel("Date column").locator("option:checked")).toHaveText(
    "C · Issue Date",
  );
  await expect(card.getByLabel("Amount column (revenue)").locator("option:checked")).toHaveText(
    "E · Subtotal",
  );
  const status = card.getByLabel("Status column (optional)");
  await expect(status.locator("option:checked")).toHaveText("D · Status");

  // The month is the two issued invoices; the draft and the void are listed with their reason.
  const table = card.getByRole("table", { name: "Monthly totals from invoice_details.csv" });
  await expect(table.getByRole("row")).toHaveCount(1);
  await expect(
    table.getByRole("row", { name: new RegExp(`^${month.name} \\$500\\.00 2 rows$`) }),
  ).toBeVisible();
  await expect(
    card.getByText(
      "2 rows marked void, deleted or draft, left out because a Status column is chosen (if they are sales of yours, choose None): rows 7, 8",
    ),
  ).toBeVisible();

  // Clearing the select counts every row again, and says nothing is left out.
  await status.selectOption("");
  await expect(
    table.getByRole("row", { name: new RegExp(`^${month.name} \\$830\\.00 4 rows$`) }),
  ).toBeVisible();
  await expect(card.getByText(/left out because a Status column is chosen/)).toHaveCount(0);
  await expect(card.getByText("Left out", { exact: true })).toHaveCount(0);

  // Choosing the column again leaves them out again.
  await status.selectOption({ label: "D · Status" });
  await expect(
    table.getByRole("row", { name: new RegExp(`^${month.name} \\$500\\.00 2 rows$`) }),
  ).toBeVisible();

  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("a ledger export: refunds picked from the Debit column are taken off the month they were paid back", async ({
  page,
}) => {
  const { card, ventureId, figures } = await openSalish(page);
  const before = await figures();

  // Wave-shaped Account Transactions for the Sales account (invented numbers): sales in Credit,
  // refunds paid back in Debit. A sale in the first month, a sale and a 40.00 refund (for the first
  // month's sale) in the second, and only a 25.00 refund in the third.
  const [a, b, c] = [monthsAgo(4), monthsAgo(3), monthsAgo(2)];
  const day = (m: { y: number; m: number }, d: number) => `${m.y}-${two(m.m)}-${two(d)}`;
  const lines = [
    "Invented Shop Ltd.",
    "Account Transactions",
    "",
    "Date,Description,Debit,Credit,Balance",
    "Sales",
    "Starting Balance,,,,0.00",
    `${day(a, 8)},Invoice 1 - Invented Client A,,500.00,500.00`,
    `${day(b, 5)},Invoice 2 - Invented Client B,,320.00,820.00`,
    `${day(b, 19)},Refund - Invented Client A,40.00,,780.00`,
    `${day(c, 3)},Refund - Invented Client B,25.00,,755.00`,
    "Totals,,65.00,820.00,",
  ];
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "account-transactions.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n") + "\n", "utf8"),
  });

  // The date is pre-filled; the refunds column never is, and offers "None" until the person picks.
  await expect(card.getByLabel("Date column").locator("option:checked")).toHaveText("A · Date");
  const refunds = card.getByLabel("Refunds / money out column (optional)");
  await expect(refunds).toBeVisible();
  await expect(refunds.locator("option:checked")).toHaveText("None — refunds not taken off");
  await expect(
    card.getByText(
      "Ledger exports, such as Wave's Account Transactions, keep sales in one column (Credit) and refunds paid back to customers in another (Debit).",
      { exact: false },
    ),
  ).toBeVisible();

  // With only Credit picked, the refunds are rows with no amount, and nothing is taken off.
  await card.getByLabel("Amount column (revenue)").selectOption({ label: "D · Credit" });
  const table = card.getByRole("table", { name: "Monthly totals from account-transactions.csv" });
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(
    table.getByRole("row", { name: new RegExp(`^${b.name} \\$320\\.00 1 row$`) }),
  ).toBeVisible();
  await expect(card.getByText(/2 rows with a date but no amount/)).toBeVisible();
  await expect(card.getByText(/taken off the month they were paid back/)).toHaveCount(0);

  // Picking Debit as the refunds column takes each refund off the month it was paid back: the
  // second month, not the first month's sale, and the third month goes below zero.
  await refunds.selectOption({ label: "C · Debit" });
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(
    table.getByRole("row", { name: new RegExp(`^${a.name} \\$500\\.00 1 row$`) }),
  ).toBeVisible();
  await expect(
    table.getByRole("row", {
      name: new RegExp(`^${b.name} \\$280\\.00 2 rows · 1 refund taken off \\(\\$40\\.00\\)$`),
    }),
  ).toBeVisible();
  await expect(
    table.getByRole("row", {
      name: new RegExp(`^${c.name} [-−]\\$25\\.00 1 row · 1 refund taken off \\(\\$25\\.00\\)$`),
    }),
  ).toBeVisible();
  await expect(
    card.getByText(
      "Refunds are taken off the month they were paid back, which may be a later month than the sale they refund.",
    ),
  ).toBeVisible();
  await expect(card.getByText(/with a date but no amount/)).toHaveCount(0);

  // The same column as the amount is refused with a sentence, and no totals are shown.
  await refunds.selectOption({ label: "D · Credit" });
  await expect(
    card.getByText("The refunds column can't be the date or the amount column."),
  ).toBeVisible();
  await expect(table).toHaveCount(0);
  await refunds.selectOption({ label: "C · Debit" });
  await expect(table.getByRole("row")).toHaveCount(3);

  // Review sends the netted totals, the negative month included. The request is answered here
  // with an error so nothing is stored and the idea's figures stay as they were.
  let sent: unknown = null;
  await page.route("**/api/figures/propose", async (route) => {
    sent = JSON.parse(route.request().postData() ?? "null");
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Held by the test." }),
    });
  });
  // Review waits for the dates to be confirmed (the "These dates are right" tick-box).
  await card.getByRole("checkbox", { name: "These dates are right" }).check();
  await card.getByRole("button", { name: "Review these 3 figures" }).click();
  await expect(card.getByText("Held by the test.")).toBeVisible();
  const lastDay = (m: { y: number; m: number }) => new Date(Date.UTC(m.y, m.m, 0)).getUTCDate();
  const figure = (m: { y: number; m: number }, amountCents: number, rows: number) => ({
    kind: "gross-revenue",
    periodStart: `${m.y}-${two(m.m)}-01`,
    periodEnd: `${m.y}-${two(m.m)}-${lastDay(m)}`,
    amountCents,
    currency: "CAD",
    rows,
  });
  expect(sent).toEqual({
    ventureId,
    source: { kind: "file", label: "account-transactions.csv", rows: 4 },
    figures: [figure(a, 50000, 1), figure(b, 28000, 2), figure(c, -2500, 1)],
  });
  await page.unroute("**/api/figures/propose");

  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("an .xlsx is read in the window; a renamed picture and a macro workbook are refused", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const seen = watchRequests(page);

  // Real date cells (Excel's serial numbers with a date format) and plain numbers, in months
  // well apart from the CSV test's so the two never meet.
  const [a, b] = [monthsAgo(7), monthsAgo(6)];
  const workbook = makeXlsx([
    {
      name: "Invoices",
      rows: [
        ["Invoice Date", "Customer", "Amount"],
        [{ date: `${a.y}-${two(a.m)}-03` }, "Client One", 1500.5],
        [{ date: `${a.y}-${two(a.m)}-21` }, "Client Two", 250],
        [{ date: `${b.y}-${two(b.m)}-09` }, "Client One", 80.25],
      ],
    },
  ]);

  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  const input = card.getByLabel("Choose a file");
  await input.setInputFiles({
    name: "invoices.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(workbook),
  });
  const table = card.getByRole("table", { name: "Monthly totals from invoices.xlsx" });
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(
    table.getByRole("row", { name: new RegExp(`^${a.name} \\$1,750\\.50 2 rows$`) }),
  ).toBeVisible();
  await expect(
    table.getByRole("row", { name: new RegExp(`^${b.name} \\$80\\.25 1 row$`) }),
  ).toBeVisible();
  await expect(card.getByLabel("Date column").locator("option:checked")).toHaveText(
    "A · Invoice Date",
  );
  await expect(card.getByLabel("Amount column (revenue)").locator("option:checked")).toHaveText(
    "C · Amount",
  );

  // The answer covered that one file: the next file starts from the question again.
  await card.getByRole("button", { name: "Change" }).click();
  await answerAccounting(card);

  // A picture's first bytes under a spreadsheet's name: turned away, no preview, nothing sent.
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64, 7),
  ]);
  await input.setInputFiles({
    name: "sales.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: png,
  });
  await expect(card.getByRole("alert")).toContainText("That isn't a spreadsheet.");
  await expect(card.getByRole("table")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);
  // After a refusal the way on is back to the question, not another file on the same answer.
  await card.getByRole("button", { name: "Choose another file" }).click();
  await answerAccounting(card);

  // A macro workbook: refused with the macros message.
  const macros = makeXlsx(
    [
      {
        name: "Sheet1",
        rows: [
          ["Date", "Amount"],
          [{ date: `${a.y}-${two(a.m)}-03` }, 10],
        ],
      },
    ],
    { withMacros: true },
  );
  await input.setInputFiles({
    name: "sales.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(macros),
  });
  await expect(card.getByRole("alert")).toContainText(
    "That workbook has macros. DotAmi never runs macros",
  );
  await expect(card.getByRole("table")).toHaveCount(0);

  // Neither refusal, nor the preview, created anything; and nothing but the page's own code and
  // /api/figures was ever asked for, with no request carrying a body.
  expect(await figures()).toEqual(before);
  expectNothingLeftThisPage(seen, ["Client One", "Client Two", "Invoice Date"]);
  expect(seen.filter((r) => r.body !== null)).toEqual([]);
});

test("a large workbook reads without freezing", async ({ page }) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  const workers: string[] = [];
  page.on("worker", (w) => workers.push(w.url()));

  // 12,000 invoices spread evenly over 24 past months: 500 rows and $5,000.00 each. Its sheet XML
  // unpacks to about 1.3 MB from about 150 KB, and fflate (inside read-excel-file) unpacks a part
  // that big and that well compressed in a background worker started from a blob: address. The
  // app's Content-Security-Policy has no worker-src, so script-src applies, and its 'strict-dynamic'
  // lets the app's own trusted scripts start one. This test proves the worker really starts under
  // the real policy — if a policy change ever blocks it, large workbooks stop reading.
  const ROWS = 12_000;
  const MONTHS = 24;
  const rows: XlsxCell[][] = [["Invoice Date", "Customer", "Amount"]];
  for (let i = 0; i < ROWS; i += 1) {
    const month = monthsAgo(3 + (i % MONTHS));
    rows.push([
      { date: `${month.y}-${two(month.m)}-${two(1 + (i % 28))}` },
      `Customer ${i % 40}`,
      10,
    ]);
  }
  const workbook = makeXlsx([{ name: "Invoices", rows }]);

  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "big-year.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(workbook),
  });

  const table = card.getByRole("table", { name: "Monthly totals from big-year.xlsx" });
  await expect(table).toBeVisible({ timeout: 20_000 });
  await expect(table.getByRole("row")).toHaveCount(MONTHS);
  await expect(
    table.getByRole("row", { name: new RegExp(`^${monthsAgo(3).name} \\$5,000\\.00 500 rows$`) }),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: `Review these ${MONTHS} figures` })).toBeVisible();
  expect(problems.filter((p) => /worker|content security policy|refused/i.test(p))).toEqual([]);
  expect(workers.some((url) => url.startsWith("blob:"))).toBe(true);
  expect(await figures()).toEqual(before);
});

// ---- [8c] ask where the file is from, before anything is read ---------------------
// The panel's first screen is a question, asked for every file. These tests prove the question
// comes first, that a "bank or credit card" answer opens nothing, and that the answer is never kept.

const ORIGIN_QUESTION = "Where is this file from?";

/** A one-month CSV that reads cleanly: day-first dates with a day above 12, so nothing is asked. */
function tinyCsv(): string {
  const month = monthsAgo(11);
  return `Date,Customer,Amount\n20/${two(month.m)}/${month.y},Client A,100.00\n`;
}

/**
 * Records every way the page could read a file's contents (Blob methods and FileReader). The
 * recorder must be installed before the drop; `reads()` then says which methods were called.
 */
async function recordFileReads(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __fileReads: string[] };
    w.__fileReads = [];
    for (const name of ["arrayBuffer", "text", "stream", "slice"] as const) {
      const original = Blob.prototype[name] as (...args: unknown[]) => unknown;
      Blob.prototype[name] = function (this: Blob, ...args: unknown[]) {
        w.__fileReads.push(`Blob.${name}`);
        return original.apply(this, args);
      } as never;
    }
    for (const name of [
      "readAsArrayBuffer",
      "readAsText",
      "readAsBinaryString",
      "readAsDataURL",
    ] as const) {
      const original = FileReader.prototype[name] as (...args: unknown[]) => unknown;
      FileReader.prototype[name] = function (this: FileReader, ...args: unknown[]) {
        w.__fileReads.push(`FileReader.${name}`);
        return original.apply(this, args);
      } as never;
    }
  });
  return () =>
    page.evaluate(() => (window as unknown as { __fileReads: string[] }).__fileReads.slice());
}

/** Lets a file go on `target` the way a person's drop would. */
async function dropFile(page: Page, target: Locator, name: string, text: string) {
  const transfer = await page.evaluateHandle(
    ({ name, text }) => {
      const t = new DataTransfer();
      t.items.add(new File([text], name, { type: "text/csv" }));
      return t;
    },
    { name, text },
  );
  await target.dispatchEvent("drop", { dataTransfer: transfer });
}

test("the first thing 'Add from a file' shows is a question, with nothing to drop or choose", async ({
  page,
}) => {
  const { card } = await openSalish(page);
  await card.getByRole("button", { name: "Add from a file" }).click();

  const panel = card.getByRole("group", { name: "Add from a file" });
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  const question = panel.getByRole("group", { name: ORIGIN_QUESTION });
  await expect(
    question.getByRole("button", { name: "Accounting software or a spreadsheet you keep" }),
  ).toBeVisible();
  await expect(
    question.getByRole("button", { name: "A bank or credit card account" }),
  ).toBeVisible();
  await expect(panel.getByText(/QuickBooks, Xero, Wave, FreshBooks/)).toBeVisible();

  // No way to pick or drop a file yet: no file input, no drop area, no "Choose a file".
  await expect(card.locator('input[type="file"]')).toHaveCount(0);
  await expect(card.getByLabel("Choose a file")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Choose a file" })).toHaveCount(0);
  await expect(card.getByRole("group", { name: "Drop a spreadsheet here" })).toHaveCount(0);

  // The question is the same after Cancel: the answer was never kept.
  await card.getByRole("button", { name: "Cancel" }).click();
  await card.getByRole("button", { name: "Add from a file" }).click();
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  await card.getByRole("button", { name: "Cancel" }).click();
});

/** Waits until anything a stray drop could have started (a chunk import, then a read) has had its turn. */
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150))),
      ),
  );
}

test("a file dropped before answering, or after 'bank or credit card', is never read", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const reads = await recordFileReads(page);
  const seen = watchRequests(page);
  const panel = card.getByRole("group", { name: "Add from a file" });
  // A bank-looking file whose name carries account digits: neither the name nor the cell may appear anywhere afterwards.
  const secrets = ["chequing-4829", "Payroll Deposit"];
  const csv = tinyCsv().replace("Client A", "Payroll Deposit");

  await card.getByRole("button", { name: "Add from a file" }).click();

  // The control comes first: a drop after the "accounting" answer IS read. That proves the recorder
  // can see a read, and it loads the reader code, so a stray read below could not hide behind a
  // first-use download delay.
  await answerAccounting(card);
  await dropFile(
    page,
    card.getByRole("group", { name: "Drop a spreadsheet here" }),
    "sales-control.csv",
    tinyCsv(),
  );
  await expect(
    card.getByRole("table", { name: "Monthly totals from sales-control.csv" }),
  ).toBeVisible();
  expect(await reads()).toContain("Blob.arrayBuffer");
  await panel.getByRole("button", { name: "Change" }).click();
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  const baseline = (await reads()).length;
  const readsSince = async () => (await reads()).slice(baseline);

  // 1. Dropped on the question itself (on its text, and on the panel): ignored, the question
  // stays, nothing read.
  await dropFile(page, panel.getByText(ORIGIN_QUESTION), "chequing-4829.csv", csv);
  await dropFile(page, panel, "chequing-4829.csv", csv);
  await settle(page);
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  expect(await readsSince()).toEqual([]);
  await expect(card.getByText("chequing-4829")).toHaveCount(0);

  // 2. "A bank or credit card account": the warning, in plain English, with Back and Cancel.
  await panel.getByRole("button", { name: "A bank or credit card account" }).click();
  const warning = panel.getByRole("alert");
  await expect(warning).toContainText("DotAmi can't add bank or card statements yet.");
  await expect(warning).toContainText(
    "When it can, you'll pick which deposits are business revenue, after a warning about what DotAmi would keep.",
  );
  await expect(warning).toContainText("Nothing from your file was opened or kept.");
  await expect(warning).not.toContainText(/\[\d+[a-z]/); // no story codes in the screen
  await expect(warning.getByRole("button", { name: "Back" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(card.locator('input[type="file"]')).toHaveCount(0);
  await expect(card.getByRole("group", { name: "Drop a spreadsheet here" })).toHaveCount(0);

  // 3. Dropped on the warning (and on the panel): still ignored. Nothing proposed, no figure, no
  // name shown.
  await dropFile(page, warning, "chequing-4829.csv", csv);
  await dropFile(page, panel, "chequing-4829.csv", csv);
  await settle(page);
  expect(await readsSince()).toEqual([]);
  await expect(card.getByText("chequing-4829")).toHaveCount(0);
  await expect(card.getByRole("table")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);
  expect(await figures()).toEqual(before);
  expect(seen.filter((r) => r.path.startsWith("/api/figures/propose"))).toEqual([]);
  expectNothingLeftThisPage(seen, secrets);

  // Back returns to the question, and still nothing has been read.
  await warning.getByRole("button", { name: "Back" }).click();
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await settle(page);
  expect(await readsSince()).toEqual([]);

  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("the answer covers one file: the next file brings the question back and is never read unasked", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const reads = await recordFileReads(page);
  const panel = card.getByRole("group", { name: "Add from a file" });
  const month = monthsAgo(11);
  const bankCsv = `Date,Customer,Amount\n20/${two(month.m)}/${month.y},Payroll Deposit,100.00\n`;

  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "sales-first.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(tinyCsv(), "utf8"),
  });
  const firstTable = card.getByRole("table", { name: "Monthly totals from sales-first.csv" });
  await expect(firstTable).toBeVisible();

  // The first file used the answer up: no file input or drop area is left on the screen, and a
  // second file dropped on the panel is ignored unread.
  await expect(card.locator('input[type="file"]')).toHaveCount(0);
  await expect(card.getByRole("group", { name: "Drop a spreadsheet here" })).toHaveCount(0);
  const baseline = (await reads()).length;
  await dropFile(page, panel, "chequing-4829.csv", bankCsv);
  await settle(page);
  expect((await reads()).slice(baseline)).toEqual([]);
  await expect(firstTable).toBeVisible();
  await expect(card.getByText("chequing-4829")).toHaveCount(0);

  // The way to another file is the question again.
  await panel.getByRole("button", { name: "Change" }).click();
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  await expect(card.getByRole("table")).toHaveCount(0);

  // A refused file uses the answer up too: "Choose another file" goes back to the question.
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "notes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("", "utf8"),
  });
  await expect(panel.getByRole("alert")).toBeVisible();
  await expect(card.locator('input[type="file"]')).toHaveCount(0);
  await panel.getByRole("button", { name: "Choose another file" }).click();
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  await expect(card.locator('input[type="file"]')).toHaveCount(0);

  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

test("'Change' returns to the question and forgets the file; the answer is never stored", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const panel = card.getByRole("group", { name: "Add from a file" });
  const storageSize = () =>
    page.evaluate(() => `${window.localStorage.length}/${window.sessionStorage.length}`);
  const storageBefore = await storageSize();

  await card.getByRole("button", { name: "Add from a file" }).click();
  await panel
    .getByRole("button", { name: "Accounting software or a spreadsheet you keep" })
    .click();
  await expect(
    panel.getByText("From: Accounting software or a spreadsheet you keep"),
  ).toBeVisible();
  await card.getByLabel("Choose a file").setInputFiles({
    name: "sales-change.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(tinyCsv(), "utf8"),
  });
  await expect(
    card.getByRole("table", { name: "Monthly totals from sales-change.csv" }),
  ).toBeVisible();

  await panel.getByRole("button", { name: "Change" }).click();
  await expect(panel.getByText(ORIGIN_QUESTION)).toBeVisible();
  await expect(card.getByRole("table")).toHaveCount(0);
  await expect(card.getByText("sales-change.csv")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Review (these|this)/ })).toHaveCount(0);
  await expect(card.locator('input[type="file"]')).toHaveCount(0);

  // Answering again starts from an empty drop area: the earlier file is gone.
  await panel
    .getByRole("button", { name: "Accounting software or a spreadsheet you keep" })
    .click();
  await expect(card.getByRole("group", { name: "Drop a spreadsheet here" })).toBeVisible();
  await expect(card.getByText("sales-change.csv")).toHaveCount(0);
  await expect(card.getByRole("table")).toHaveCount(0);

  // The answer lives in the panel's state only: nothing in browser storage, nothing saved.
  expect(await storageSize()).toBe(storageBefore);
  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

// ---- [8f] read last year's return: look only, nothing proposed or kept --------------
// The PDFs are invented and built in code, laid out like the CRA's own T2125
// (tests/fixtures/returns/cra-layout.ts); no real return and no real figure is used.

function inventedReturn(): Buffer {
  return Buffer.from(
    makePdf([
      otherFormPage("Income Tax and Benefit Return", "5000-R"),
      ...t2125Pages({ amounts: INVENTED_AMOUNTS }),
      otherFormPage("Schedule 8", "5000-S8"),
    ]),
  );
}

test("a return PDF: each T2125's four lines and their pages, read in a worker that can reach nothing", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  // The reader's worker and the response that delivered its script (its policy comes from there).
  const workers: Worker[] = [];
  page.on("worker", (w) => workers.push(w));
  const scriptHeaders = new Map<string, string | undefined>();
  page.on("response", (r) => {
    if (new URL(r.url()).pathname.startsWith("/_next/static/")) {
      scriptHeaders.set(r.url(), r.headers()["content-security-policy"]);
    }
  });
  const seen = watchRequests(page);

  await card.getByRole("button", { name: "Add from last year's return" }).click();
  const panel = card.getByRole("group", { name: "Add from last year's return" });
  await expect(panel.getByText(/DotAmi shows lines 8299, 9368, 9369 and 9946/)).toBeVisible();
  await expect(panel.getByText(/It's read here, on this computer, and never kept/)).toBeVisible();
  await card.getByLabel("Choose a PDF").setInputFiles({
    name: "invented-return-2025.pdf",
    mimeType: "application/pdf",
    buffer: inventedReturn(),
  });

  // What the person sees: the file, the T2125's pages, and each line with its page and amount.
  await expect(panel.getByText("invented-return-2025.pdf")).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText(/5 pages · 1 T2125/)).toBeVisible();
  const table = panel.getByRole("table", { name: "T2125 on pages 2 to 4" });
  await expect(table).toBeVisible();
  for (const row of [
    "8299 Gross business or professional income 3 48,250.00",
    "9368 Total expenses 4 12,730.45",
    "9369 Net income (loss) before adjustments 4 35,519.55",
    "9946 Your net income (loss) 4 33,019.55",
  ]) {
    await expect(table.getByRole("row", { name: row, exact: true })).toBeVisible();
  }
  await expect(panel.getByText(/DotAmi only shows them: nothing is added to your figures or kept/)).toBeVisible();
  // Nothing to review or agree: this slice only looks.
  await expect(card.getByRole("button", { name: /^Review/ })).toHaveCount(0);

  // The reader ran in its own worker, from DotAmi's own static files, under the policy
  // next.config.mjs gives those files...
  const reader = workers.find((w) => new URL(w.url()).pathname.startsWith("/_next/static/"));
  expect(reader, "the return reader's worker").toBeTruthy();
  expect(scriptHeaders.get(reader!.url())).toContain("default-src 'none'");
  // ...and the browser holds it to that policy: from inside the worker, even DotAmi's own server
  // can't be reached. (Proves the header is applied, not just sent.)
  const attempt = await reader!.evaluate(() =>
    fetch("/api/figures").then(
      () => "reached",
      () => "refused",
    ),
  );
  expect(attempt).toBe("refused");

  // Privacy: the page fetched only its own code chunks (and /api/figures for the list it already
  // shows); no amount went anywhere, and nothing was posted.
  expectNothingLeftThisPage(seen, ["48,250.00", "4825000", "12,730.45", "33,019.55", "invented-return"]);
  expect(seen.filter((r) => r.method !== "GET")).toEqual([]);
  expect(problems.filter((p) => /worker|content security policy/i.test(p))).toEqual([]);

  // Close stops the worker and forgets the file; nothing was saved.
  const stopped = new Promise<void>((resolve) => reader!.once("close", () => resolve()));
  await panel.getByRole("button", { name: "Close" }).click();
  await stopped;
  await expect(card.getByRole("group", { name: "Add from last year's return" })).toHaveCount(0);
  expect(await figures()).toEqual(before);
});

test("a return PDF that can't be read gets a plain sentence: locked, pictures only, no T2125, not a PDF", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  await card.getByRole("button", { name: "Add from last year's return" }).click();
  const panel = card.getByRole("group", { name: "Add from last year's return" });

  const cases: { name: string; buffer: Buffer; says: string }[] = [
    {
      name: "locked.pdf",
      buffer: Buffer.from(makePdf(t2125Pages({ amounts: INVENTED_AMOUNTS }), { userPassword: "invented" })),
      says: "That PDF is locked with a password, and DotAmi never asks for one.",
    },
    {
      name: "scan.pdf",
      buffer: Buffer.from(makePdf([{ picture: true }, { picture: true }])),
      says: "That PDF is pictures of pages, with no text DotAmi can read",
    },
    {
      name: "summary.pdf",
      buffer: Buffer.from(makePdf([otherFormPage("Income Tax and Benefit Return", "5000-R")])),
      says: "DotAmi found no T2125 (Statement of Business or Professional Activities) in that PDF.",
    },
    {
      name: "photo.pdf",
      buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]),
      says: "That isn't a PDF.",
    },
  ];
  for (const c of cases) {
    await card.getByLabel("Choose a PDF").setInputFiles({ name: c.name, mimeType: "application/pdf", buffer: c.buffer });
    await expect(panel.getByRole("alert")).toContainText(c.says, { timeout: 20_000 });
    await expect(panel.getByRole("alert")).toContainText("Nothing from it was kept.");
    await expect(panel.getByRole("table")).toHaveCount(0);
    await panel.getByRole("button", { name: "Choose another file" }).click();
    await expect(card.getByLabel("Choose a PDF")).toHaveCount(1);
  }
  await panel.getByRole("button", { name: "Close" }).click();
  expect(await figures()).toEqual(before);
});

test("a PDF dropped on 'Add from a file' is pointed to the return button, unread", async ({ page }) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await card.getByLabel("Choose a file").setInputFiles({
    name: "invented-return-2025.pdf",
    mimeType: "application/pdf",
    buffer: inventedReturn(),
  });
  await expect(card.getByRole("alert")).toContainText("That's a PDF.");
  await expect(card.getByRole("alert")).toContainText("use Add from last year's return");
  await expect(card.getByRole("table")).toHaveCount(0);
  await card.getByRole("button", { name: "Cancel" }).click();
  expect(await figures()).toEqual(before);
});

// ---- [8h] A GnuCash book --------------------------------------------------------------------
// An invented book for the invented "Demo — Salish Trail Maps", built by tests/helpers/make-gnucash.ts.
// Its months are in 2024, so the figures it adds can't touch the reminder tests' recent months.

/** An invented GnuCash book: map commissions and bank interest (both income), a chequing account, an expense. */
function inventedBook(): string {
  const next = monthsAgo(-1); // a month that hasn't ended: never totalled
  const sale = (date: string, account: string, amount: string, description = "Invented sale") => ({
    date,
    description,
    splits: [
      { account: "bank", quantity: amount.startsWith("-") ? amount.slice(1) : `-${amount}` },
      { account, quantity: amount },
    ],
  });
  return gnucashXml({
    accounts: [
      { key: "income", name: "Income", type: "INCOME" },
      { key: "maps", name: "Map Commissions", type: "INCOME", parent: "income" },
      { key: "interest", name: "Bank Interest", type: "INCOME", parent: "income" },
      { key: "assets", name: "Assets", type: "ASSET" },
      { key: "bank", name: "Chequing", type: "BANK", parent: "assets" },
      { key: "expenses", name: "Expenses", type: "EXPENSE" },
      { key: "paper", name: "Paper", type: "EXPENSE", parent: "expenses" },
    ],
    transactions: [
      sale("2024-03-05", "maps", "-150000/100", "Trailhead Co-op wall map"),
      sale("2024-03-20", "maps", "-25000/100"),
      sale("2024-03-31", "interest", "-1234/100"),
      sale("2024-04-10", "maps", "-200000/100"),
      sale("2024-04-15", "maps", "10000/100", "Refund to Trailhead Co-op"),
      sale("2024-04-30", "interest", "-1000/100"),
      { date: "2024-04-12", splits: [{ account: "paper", quantity: "4500/100" }, { account: "bank", quantity: "-4500/100" }] },
      sale(`${next.y}-${two(next.m)}-02`, "maps", "-99900/100"),
    ],
    // A scheduled monthly retainer: planned, never counted.
    templateTransactions: [sale("2024-05-01", "maps", "-50000/100", "Planned retainer")],
  });
}

test("a GnuCash book: income accounts ticked, read in a worker that can reach nothing, totals agreed under Books / file", async ({
  page,
}) => {
  const { card, ventureId, figures } = await openSalish(page);
  const before = await figures();
  const workers: Worker[] = [];
  page.on("worker", (w) => workers.push(w));
  const seen = watchRequests(page);
  const secrets = ["Trailhead", "Map Commissions", "Bank Interest", "Chequing", "Planned retainer", "1762.34", "176234"];

  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  await expect(card.getByText("Drop a .xlsx or .csv file, or a GnuCash book, here, or")).toBeVisible();
  // Compressed, the way GnuCash saves a book by default.
  await card.getByLabel("Choose a file").setInputFiles({
    name: "salish-books.gnucash",
    mimeType: "application/gzip",
    buffer: Buffer.from(gnucashGz(inventedBook())),
  });

  // What the person sees first: the file, that DotAmi read the last save, and every account.
  await expect(card.getByText("File: salish-books.gnucash")).toBeVisible({ timeout: 20_000 });
  await expect(card.getByText(/^DotAmi read your last save\./)).toBeVisible();
  const accounts = card.getByRole("group", { name: "Accounts in this book" });
  await expect(accounts.getByRole("checkbox", { name: "Income:Map Commissions" })).toBeChecked();
  // Bank interest is income to GnuCash: shown and ticked, never hidden, and the person decides.
  await expect(accounts.getByRole("checkbox", { name: "Income:Bank Interest" })).toBeChecked();
  await expect(accounts.getByRole("checkbox", { name: "Assets:Chequing" })).not.toBeChecked();
  await expect(accounts.getByRole("checkbox", { name: "Expenses:Paper" })).not.toBeChecked();
  await expect(accounts.getByRole("checkbox")).toHaveCount(7);
  await expect(accounts).toContainText("An income account can also hold interest, or GST/HST you collected");

  // Monthly totals with interest ticked, then without it.
  const table = card.getByRole("table", { name: "Monthly totals from salish-books.gnucash (CAD)" });
  await expect(table.getByRole("row", { name: "March 2024 $1,762.34 3 lines", exact: true })).toBeVisible();
  await expect(table.getByRole("row", { name: "April 2024 $1,910.00 3 lines", exact: true })).toBeVisible();
  await expect(card.getByText("1 line in a month that isn't over yet")).toBeVisible();
  // The planned retainer's two sides (bank and commissions): counted for the note, never added.
  await expect(card.getByText(/scheduled transactions \(2 lines\) are plans GnuCash hasn't posted/)).toBeVisible();
  await accounts.getByRole("checkbox", { name: "Income:Bank Interest" }).uncheck();
  await expect(table.getByRole("row", { name: "March 2024 $1,750.00 2 lines", exact: true })).toBeVisible();
  await expect(table.getByRole("row", { name: "April 2024 $1,900.00 2 lines", exact: true })).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(2);

  // Ticking the bank beside the income accounts is the person's call: it stays ticked and is counted,
  // with a plain note beside it that a sale landing in both may be counted twice.
  const twiceNote = "This isn't an income account in your book. If a sale also lands here, it may be counted twice.";
  const chequing = accounts.getByRole("checkbox", { name: "Assets:Chequing" });
  await chequing.check();
  await expect(chequing).toBeChecked();
  await expect(chequing).toHaveAccessibleDescription(twiceNote);
  await expect(accounts.getByText(twiceNote)).toHaveCount(1);
  // March: the commissions (1,750.00) plus the bank's side of those same sales and the interest (1,762.34).
  await expect(table.getByRole("row", { name: "March 2024 $3,512.34 5 lines", exact: true })).toBeVisible();
  // An income account carries no such note.
  await expect(accounts.getByRole("checkbox", { name: "Income:Map Commissions" })).toHaveAccessibleDescription("");
  await chequing.uncheck();
  await expect(accounts.getByText(twiceNote)).toHaveCount(0);
  await expect(table.getByRole("row", { name: "March 2024 $1,750.00 2 lines", exact: true })).toBeVisible();

  // The book was read in DotAmi's own worker, which the browser keeps from reaching anything.
  const reader = workers.find((w) => new URL(w.url()).pathname.startsWith("/_next/static/"));
  expect(reader, "the books worker").toBeTruthy();
  const attempt = await reader!.evaluate(() =>
    fetch("/api/figures").then(
      () => "reached",
      () => "refused",
    ),
  );
  expect(attempt).toBe("refused");
  // Reading and ticking sent nothing: no body, no account name, no amount.
  expectNothingLeftThisPage(seen, secrets);
  expect(seen.filter((r) => r.body !== null)).toEqual([]);

  // Review: only the monthly totals go, under the source kind "books".
  await card.getByRole("button", { name: "Review these 2 figures" }).click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt).toBeVisible();
  const proposals = seen.filter((r) => r.path === "/api/figures/propose");
  expect(proposals).toHaveLength(1);
  expect(JSON.parse(proposals[0].body!)).toEqual({
    ventureId,
    source: { kind: "books", label: "salish-books.gnucash", rows: 4 },
    figures: [
      { kind: "gross-revenue", periodStart: "2024-03-01", periodEnd: "2024-03-31", amountCents: 175000, currency: "CAD", rows: 2 },
      { kind: "gross-revenue", periodStart: "2024-04-01", periodEnd: "2024-04-30", amountCents: 190000, currency: "CAD", rows: 2 },
    ],
  });
  expectNothingLeftThisPage(seen, secrets);
  await expect(prompt.getByRole("region", { name: "From salish-books.gnucash" })).toContainText("March 2024");
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toBeHidden();
  await expect(card.getByText("from salish-books.gnucash · 2 rows")).toHaveCount(2);
  const after = await figures();
  expect(after.length).toBe(before.length + 2);
  expect(after.filter((f) => f.sourceLabel === "salish-books.gnucash").map((f) => f.status)).toEqual([
    "confirmed",
    "confirmed",
  ]);

  // Where the source is named to people, it reads "Books / file".
  await page.goto("/your-data");
  await expect(page.getByText("Books / file").first()).toBeVisible();
  await expect(page.getByText("salish-books.gnucash").first()).toBeVisible();
});

test("a GnuCash book with a feature DotAmi doesn't know is refused by name, and nothing is proposed", async ({
  page,
}) => {
  const { card, figures } = await openSalish(page);
  const before = await figures();
  const seen = watchRequests(page);
  await card.getByRole("button", { name: "Add from a file" }).click();
  await answerAccounting(card);
  // Plain XML this time (GnuCash can save without compression), from an imagined newer GnuCash.
  await card.getByLabel("Choose a file").setInputFiles({
    name: "newer.gnucash",
    mimeType: "application/xml",
    buffer: Buffer.from(gnucashXml({ ...smallBook(), features: ["Teleporting invoices"] }), "utf8"),
  });
  await expect(card.getByRole("alert")).toContainText(`GnuCash feature DotAmi doesn't know ("Teleporting invoices")`);
  await expect(card.getByRole("alert")).toContainText("DotAmi won't guess, so it read nothing.");
  await expect(card.getByRole("group", { name: "Accounts in this book" })).toHaveCount(0);
  await expect(card.getByRole("table")).toHaveCount(0);
  await card.getByRole("button", { name: "Cancel" }).click();
  expect(seen.filter((r) => r.method !== "GET")).toEqual([]);
  expect(await figures()).toEqual(before);
});

/** A raw GET with headers a browser page could be tricked into sending; resolves with the status. */
function rawGet(baseURL: string, path: string, headers: Record<string, string>): Promise<number> {
  const { hostname, port } = new URL(baseURL);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: hostname, port, path, method: "GET", headers }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end();
  });
}

test("answers only on this computer's own address (DNS rebinding guard)", async ({ baseURL }) => {
  const port = new URL(baseURL!).port;
  // A rebound page sends its own domain as the Host: data routes, pages and prefetches all refuse.
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `evil.example:${port}` })).toBe(421);
  expect(await rawGet(baseURL!, "/", { Host: `evil.example:${port}` })).toBe(421);
  expect(await rawGet(baseURL!, "/ventures", { Host: `evil.example:${port}`, "next-router-prefetch": "1" })).toBe(421);
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `evil.example:${port}`, purpose: "prefetch" })).toBe(421);
  // The window's launch secret doesn't get a rebound page past it: the address is checked first.
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `evil.example:${port}`, ...launchSecretHeaders() })).toBe(421);
  // This computer's own names still work, for a caller with the launch secret (e2e/launch-secret.spec.ts).
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `127.0.0.1:${port}`, ...launchSecretHeaders() })).toBe(200);
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `localhost:${port}`, ...launchSecretHeaders() })).toBe(200);
});

test("the disclaimer footer is on the page and inside the window", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Information, not legal or tax advice");
  const box = await footer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(720 + 1);
});
