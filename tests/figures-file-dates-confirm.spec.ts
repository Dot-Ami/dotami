import { describe, expect, it } from "vitest";
import {
  datesCheckKey,
  datesCheckSentence,
  datesConfirmed,
  followDatesCheck,
  NO_DATES_CHECK,
  type DatesCheck,
  type DatesCheckParts,
} from "@/lib/figures/file/preview";

// [8c-3] "These dates are right". Every "Add from a file" preview says which dates it read
// ("Dates read: 3 December 2005 to 28 February 2006"); the person now ticks a box saying they are
// right before Review opens the agree prompt (the maintainer's decision, 2026-10-07: "ask the user
// to confirm dates and times"). The tick vouches for one reading of the dates only: a new file, a
// different date column, date order or century answer (or, across the top, row of month names)
// takes it away, and it never comes back on its own.

/** A file read one row per sale, ticked nowhere yet. */
const PARTS: DatesCheckParts = {
  file: 1,
  sheet: 0,
  layout: "rows",
  headerRow: 0,
  dateColumn: 0,
  dateOrder: "dmy",
  century: "",
  monthsRow: null,
  sentence:
    "Dates read: 3 December 2005 to 28 February 2006. Check these against the file's earliest and latest dates.",
};

/** The check after the person ticks the box under these answers. */
function tickedUnder(parts: DatesCheckParts): DatesCheck {
  const key = datesCheckKey(parts);
  return { ...followDatesCheck(NO_DATES_CHECK, key), ticked: true };
}

describe("datesCheckKey", () => {
  it("is the same for the same answers, so a tick holds while nothing changes", () => {
    expect(datesCheckKey({ ...PARTS })).toBe(datesCheckKey(PARTS));
    const check = tickedUnder(PARTS);
    const key = datesCheckKey(PARTS);
    expect(followDatesCheck(check, key)).toBe(check);
    expect(datesConfirmed(check, key)).toBe(true);
  });

  // Each thing that decides which dates were read, changed on its own.
  const changes: [string, Partial<DatesCheckParts>][] = [
    ["another file", { file: 2 }],
    ["another sheet", { sheet: 1 }],
    ["the other layout", { layout: "across" }],
    ["another row of column names", { headerRow: 1 }],
    ["another date column", { dateColumn: 3 }],
    ["no date column", { dateColumn: null }],
    ["the other date order", { dateOrder: "mdy" }],
    ["the date order cleared", { dateOrder: "" }],
    ["a century answer", { century: 2000 }],
    ["another row of month names", { monthsRow: 4 }],
    [
      "different dates read",
      {
        sentence:
          "Dates read: 12 March 2005 to 28 February 2006. Check these against the file's earliest and latest dates.",
      },
    ],
  ];
  for (const [what, change] of changes) {
    it(`takes the tick away for ${what}`, () => {
      const check = tickedUnder(PARTS);
      const key = datesCheckKey({ ...PARTS, ...change });
      expect(key).not.toBe(datesCheckKey(PARTS));
      expect(datesConfirmed(check, key)).toBe(false);
      expect(followDatesCheck(check, key)).toEqual({ key, ticked: false });
    });
  }

  it("takes the tick away when the century answer flips", () => {
    const yes = { ...PARTS, century: 2000 as const };
    const check = tickedUnder(yes);
    const no = datesCheckKey({ ...yes, century: 1900 });
    expect(datesConfirmed(check, no)).toBe(false);
  });
});

describe("followDatesCheck", () => {
  it("starts un-ticked", () => {
    const key = datesCheckKey(PARTS);
    expect(datesConfirmed(NO_DATES_CHECK, key)).toBe(false);
    expect(followDatesCheck(NO_DATES_CHECK, key)).toEqual({ key, ticked: false });
  });

  it("does not tick itself again when the person goes back to the answer they ticked under", () => {
    // Day first, ticked; then month first (un-ticks); then day first again. The person saw the
    // dates change twice, so they look again: the box stays empty until they tick it.
    const dayFirst = datesCheckKey(PARTS);
    const monthFirst = datesCheckKey({ ...PARTS, dateOrder: "mdy" });
    let check = tickedUnder(PARTS);
    check = followDatesCheck(check, monthFirst);
    expect(datesConfirmed(check, monthFirst)).toBe(false);
    check = followDatesCheck(check, dayFirst);
    expect(datesConfirmed(check, dayFirst)).toBe(false);
    expect(check).toEqual({ key: dayFirst, ticked: false });
  });

  it("an answer with no dates read has nothing to confirm under it", () => {
    const none = datesCheckKey({ ...PARTS, sentence: null });
    expect(datesConfirmed(tickedUnder(PARTS), none)).toBe(false);
  });
});

// While the totals are held back for something that never moves a date (the currency half typed,
// the amount column set to the date column, a totals row that can't be used), no "Dates read" line
// is on screen. The screen keys the check on the line it was last looked at under instead, so
// retyping CAD as USD (through "U" and "US") leaves the tick where it was.
describe("datesCheckSentence", () => {
  const OTHER_LINE =
    "Dates read: 12 March 2005 to 28 February 2006. Check these against the file's earliest and latest dates.";

  /** The key the screen builds for these parts with whatever line is (or isn't) on screen. */
  function screenKey(check: DatesCheck, parts: DatesCheckParts): string {
    return datesCheckKey({ ...parts, sentence: datesCheckSentence(parts.sentence, check) });
  }

  it("is the line on screen whenever there is one", () => {
    expect(datesCheckSentence(OTHER_LINE, tickedUnder(PARTS))).toBe(OTHER_LINE);
    expect(datesCheckSentence(PARTS.sentence, NO_DATES_CHECK)).toBe(PARTS.sentence);
  });

  it("keeps the tick while the currency is retyped from CAD to USD", () => {
    let check = tickedUnder(PARTS);
    // "U", then "US": held, no line on screen.
    for (let i = 0; i < 2; i += 1) {
      const key = screenKey(check, { ...PARTS, sentence: null });
      check = followDatesCheck(check, key);
      expect(datesConfirmed(check, key)).toBe(true);
    }
    // "USD": the same line is back, and the box is still ticked.
    const key = screenKey(check, PARTS);
    expect(followDatesCheck(check, key)).toBe(check);
    expect(datesConfirmed(check, key)).toBe(true);
  });

  it("still takes the tick away when the line comes back different", () => {
    let check = tickedUnder(PARTS);
    check = followDatesCheck(check, screenKey(check, { ...PARTS, sentence: null }));
    const key = screenKey(check, { ...PARTS, sentence: OTHER_LINE });
    expect(datesConfirmed(followDatesCheck(check, key), key)).toBe(false);
  });

  it("still takes the tick away for a date answer changed while the totals are held", () => {
    // Held, the date order flipped and flipped back: the dates changed under the box, so it is
    // looked at again even though the line that comes back is the one it was ticked under.
    let check = tickedUnder(PARTS);
    check = followDatesCheck(check, screenKey(check, { ...PARTS, sentence: null, dateOrder: "mdy" }));
    check = followDatesCheck(check, screenKey(check, { ...PARTS, sentence: null }));
    const key = screenKey(check, PARTS);
    expect(datesConfirmed(followDatesCheck(check, key), key)).toBe(false);
  });

  it("has no line to carry before anything was looked at", () => {
    expect(datesCheckSentence(null, NO_DATES_CHECK)).toBeNull();
  });
});
