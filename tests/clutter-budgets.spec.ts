/**
 * The clutter budgets can only go down (docs/ui-spec/README.md, "The clutter limit"; the maintainer's pick of
 * 2026-10-17). `e2e/clutter-budget.spec.ts` holds each screen to its budget in a real browser; this holds the
 * budgets themselves down, so a busier screen can't pass by raising its own limit:
 *
 * - never above the baseline, what the screens measured the day the limit was set;
 * - never above what they are on main, so a budget once lowered (the calm first view lowers the cockpit's)
 *   can't be raised back up to the baseline later.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ADDED_SCREEN_PART_OF,
  ADDED_SCREENS,
  BASELINE,
  BASELINE_SCREENS,
  BUDGETS,
  FIRST_MEASURED,
  SCREENS,
  WIDTHS,
  WINDOWS_EXTRA,
  type ClutterTable,
} from "../e2e/budgets";

/**
 * The baseline as recorded on 2026-10-17. The baseline is a record, so it never changes: this fails on any edit
 * to it, which would otherwise let a budget rise with it.
 */
const BASELINE_SHA256 = "f0c673671f47416cbb51f71408989c36d633f0ddbfd3ccae5b2c53994724b070";

const sizes = WIDTHS.map((w) => w.id);

/**
 * Every place `after` is looser than `before`: more regions, controls or text sizes allowed, or smaller text.
 * Only screens and sizes in both are compared (a screen added has no earlier limit).
 */
function looserThan(before: ClutterTable, after: ClutterTable): string[] {
  const looser: string[] = [];
  for (const screen of SCREENS) {
    for (const size of sizes) {
      const was = before[screen]?.[size];
      const now = after[screen]?.[size];
      if (!was || !now) continue;
      if (now.regions > was.regions) looser.push(`${screen} ${size}: regions ${now.regions} > ${was.regions}`);
      if (now.controls > was.controls) looser.push(`${screen} ${size}: controls ${now.controls} > ${was.controls}`);
      if (now.textSizes > was.textSizes) looser.push(`${screen} ${size}: text sizes ${now.textSizes} > ${was.textSizes}`);
      if (now.smallestTextPx < was.smallestTextPx) {
        looser.push(`${screen} ${size}: smallest text ${now.smallestTextPx}px < ${was.smallestTextPx}px`);
      }
    }
  }
  return looser;
}

/** Runs git in the checkout; null when it fails (no git, no such commit, no such file). */
function git(...args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/**
 * The commit to compare the budgets with: main as it is now.
 * - `CLUTTER_BUDGET_BASE`, when set (any commit; used to try the check by hand).
 * - On CI, the checked-out commit's first parent: a pull request is checked out as the branch merged into
 *   main, so that is main; a push to main is one squashed commit, so that is main before it. ci.yml fetches
 *   two commits deep for this.
 * - Locally, where the branch left main (`origin/main`, or `main` without a remote).
 */
function mainCommit(): string | null {
  const candidate =
    process.env.CLUTTER_BUDGET_BASE ||
    (process.env.GITHUB_ACTIONS === "true"
      ? "HEAD^1"
      : (git("merge-base", "HEAD", "origin/main") ?? git("merge-base", "HEAD", "main"))?.trim());
  if (!candidate) return null;
  return git("rev-parse", "--verify", "--quiet", `${candidate}^{commit}`)?.trim() || null;
}

/** `e2e/budgets.ts` as it is at `commit`, loaded from a copy; null when that commit has no such file. */
async function budgetsAt(commit: string): Promise<{ BASELINE: ClutterTable; BUDGETS: ClutterTable; FIRST_MEASURED?: ClutterTable } | null> {
  const source = git("show", `${commit}:e2e/budgets.ts`);
  if (source === null) return null;
  const dir = mkdtempSync(path.join(tmpdir(), "dotami-budgets-"));
  try {
    const file = path.join(dir, "budgets.ts");
    writeFileSync(file, source);
    return (await import(pathToFileURL(file).href)) as { BASELINE: ClutterTable; BUDGETS: ClutterTable; FIRST_MEASURED?: ClutterTable };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("the clutter budgets (e2e/budgets.ts)", () => {
  it("have a baseline or a first row, and a budget, for every screen at every size, and nothing else", () => {
    // The baseline is the record of 2026-10-17: a screen added since has no row there, only its first row.
    for (const [table, screens] of [
      [BASELINE, BASELINE_SCREENS],
      [FIRST_MEASURED as ClutterTable, ADDED_SCREENS],
      [BUDGETS, SCREENS],
    ] as const) {
      expect(Object.keys(table).sort()).toEqual([...screens].sort());
      for (const screen of screens) {
        expect(Object.keys(table[screen] ?? {}).sort(), screen).toEqual([...sizes].sort());
      }
    }
  });

  it("start an added screen at its first row, no busier than the screen it is a part of (the written way, 2026-10-22)", () => {
    expect(looserThan(FIRST_MEASURED, BUDGETS)).toEqual([]);
    // Each added screen's first row against the baseline of the whole screen it is a part of, as if it were that
    // screen (the whole screen's own budget may be lower: Pick a future's opens on step 1, the calmest part).
    const asWhole: ClutterTable = Object.fromEntries(ADDED_SCREENS.map((s) => [s, BASELINE[ADDED_SCREEN_PART_OF[s]]]));
    expect(looserThan(asWhole, FIRST_MEASURED)).toEqual([]);
    // The check sees a first row busier than its screen.
    const busier: ClutterTable = { "futures-area": { phone: { ...BASELINE.futures!.phone!, controls: BASELINE.futures!.phone!.controls + 1 } } };
    expect(looserThan(asWhole, busier)).toEqual([`futures-area phone: controls ${BASELINE.futures!.phone!.controls + 1} > ${BASELINE.futures!.phone!.controls}`]);
  });

  it("measure every part of Pick a future's three steps, on Pick a future and on the intake page (the PR #202 review)", () => {
    // The steps' parts as each opens: 2a and 2b, and step 3's three cases (A, a road written for the job; B, no
    // road written for it; C, the job skipped), on both pages; outside Alberta, Pick a future's step 2.
    for (const screen of [
      "futures-area",
      "futures-region",
      "futures-outside",
      "futures-road-written",
      "futures-road",
      "futures-road-skipped",
      "intake-area",
      "intake-region",
      "intake-road-written",
      "intake-road",
      "intake-road-skipped",
    ]) {
      expect(ADDED_SCREENS as readonly string[], screen).toContain(screen);
    }
    // And the browser gate measures each screen it has a budget for: a row nothing measures would hold nothing.
    const gate = readFileSync(path.join(process.cwd(), "e2e", "clutter-budget.spec.ts"), "utf8");
    const measured = new Set([...gate.matchAll(/measureAtEverySize\(page, testInfo, "([\w-]+)"/g)].map((m) => m[1]));
    expect(SCREENS.filter((s) => !measured.has(s))).toEqual([]);
  });

  it("hold the maintainer's calls of 2026-10-22 on the typed way's last step (calls 37 and 38)", () => {
    // Call 37: both versions of the typed way's last step, trimmed to the intake's 5 text sizes, at every width.
    for (const screen of ["intake-road", "intake-road-written"] as const) {
      for (const size of sizes) expect(BUDGETS[screen]?.[size]?.textSizes, `${screen} ${size}`).toBe(5);
    }
    // Call 38: the job skipped, its own row, 6 controls on a tablet accepted as the step's own limit, standing
    // beside Pick a future's same step (7 there), with 5 text sizes like the rest of the typed way's last step.
    expect(ADDED_SCREEN_PART_OF["intake-road-skipped"]).toBe("futures");
    expect(BUDGETS["intake-road-skipped"]?.tablet?.controls).toBe(6);
    expect(BASELINE.futures?.tablet?.controls).toBe(7);
    for (const size of sizes) expect(BUDGETS["intake-road-skipped"]?.[size]?.textSizes, size).toBe(5);
    // The gate runs it (the PR #202 review left it as test.fixme).
    const gate = readFileSync(path.join(process.cwd(), "e2e", "clutter-budget.spec.ts"), "utf8");
    expect(gate).not.toMatch(/test\.fixme\(/);
  });

  it("are never above the baseline or a screen's first row, and the smallest text never below it", () => {
    expect(looserThan(BASELINE, BUDGETS)).toEqual([]);
    expect(looserThan(FIRST_MEASURED, BUDGETS)).toEqual([]);
  });

  it("catch a budget above a screen's first row (the control)", () => {
    const raised: ClutterTable = {
      "cockpit-about-job": { phone: { ...FIRST_MEASURED["cockpit-about-job"]!.phone!, controls: FIRST_MEASURED["cockpit-about-job"]!.phone!.controls + 1 } },
    };
    expect(looserThan(FIRST_MEASURED, raised)).toHaveLength(1);
  });

  it("are never above what they are on main, so a budget once lowered stays down", async () => {
    const main = mainCommit();
    if (!main) {
      // No history to compare with (a copy without .git, or a clone too shallow). A pull request must
      // always be compared, so there this fails; anywhere else the baseline checks still hold.
      expect(process.env.GITHUB_EVENT_NAME, "no main commit to compare e2e/budgets.ts with").not.toBe("pull_request");
      return;
    }
    const before = await budgetsAt(main);
    // Main has no budgets yet (the pull request that adds them): the baseline is the whole limit.
    if (!before) return;
    expect(
      looserThan(before.BUDGETS, BUDGETS),
      `budgets looser than on main (${main.slice(0, 7)}); make the screen calmer instead of raising its limit`,
    ).toEqual([]);
    expect(BASELINE, `BASELINE differs from main's (${main.slice(0, 7)}); it is a record and never changes`).toEqual(
      before.BASELINE,
    );
    // A first row is a record too, once it is on main: it never changes (a new screen's first row can be added).
    for (const [screen, row] of Object.entries(before.FIRST_MEASURED ?? {})) {
      expect(FIRST_MEASURED[screen as keyof typeof FIRST_MEASURED], `FIRST_MEASURED["${screen}"] differs from main's; it is a record and never changes`).toEqual(row);
    }
  });

  it("catch a budget lowered and then raised back up, even to the baseline", () => {
    // What the calm first view (S2.5.30c) plans for the cockpit on road 0, then a later change undoing it.
    const lowered: ClutterTable = {
      "cockpit-road-0": {
        phone: { regions: 3, controls: 12, textSizes: 12, smallestTextPx: 8 },
        laptop: { regions: 5, controls: 20, textSizes: 15, smallestTextPx: 8 },
      },
    };
    const raisedBack: ClutterTable = { "cockpit-road-0": BASELINE["cockpit-road-0"] };
    expect(looserThan(BASELINE, raisedBack)).toEqual([]);
    expect(looserThan(lowered, raisedBack)).toEqual([
      "cockpit-road-0 phone: regions 8 > 3",
      "cockpit-road-0 phone: controls 19 > 12",
      "cockpit-road-0 laptop: regions 9 > 5",
      "cockpit-road-0 laptop: controls 37 > 20",
    ]);
    expect(looserThan(lowered, lowered)).toEqual([]);
  });

  it("add a Windows extra only on a real screen and size, and only as a whole number above zero", () => {
    // WINDOWS_EXTRA is read only on Windows, never by CI, so it can't loosen the gate; this keeps it to the
    // shape the browser test expects.
    const wrong: string[] = [];
    for (const [screen, bySize] of Object.entries(WINDOWS_EXTRA)) {
      if (!(SCREENS as readonly string[]).includes(screen)) wrong.push(`${screen}: not a screen`);
      for (const [size, extra] of Object.entries(bySize ?? {})) {
        if (!(sizes as readonly string[]).includes(size)) wrong.push(`${screen} ${size}: not a size`);
        for (const [measure, value] of Object.entries(extra ?? {})) {
          if (!Number.isInteger(value) || value <= 0) wrong.push(`${screen} ${size} ${measure}: ${value}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("keep the baseline exactly as it was recorded", () => {
    const recorded = createHash("sha256").update(JSON.stringify(BASELINE)).digest("hex");
    expect(recorded, "e2e/budgets.ts BASELINE is a record of 2026-10-17 and never changes; lower BUDGETS instead").toBe(
      BASELINE_SHA256,
    );
  });
});
