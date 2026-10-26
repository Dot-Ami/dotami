import { describe, expect, it } from "vitest";

import { ACTION_ROUTES } from "@/lib/demo/actions";
import { DEMO_CLOCK } from "@/lib/demo/world";
import type { Deadline } from "@/lib/model";
import { getActions, getIssue } from "@/lib/query";
import { VERIFICATION_MAX_AGE_DAYS, actionableNow, checkDeadline } from "@/lib/rules/deadlines";

const ref = { sourceId: "s", passageId: "p" };
const deadline = (date: string, lastVerifiedOn?: string): Deadline => ({
  date,
  label: "x",
  source: ref,
  lastVerifiedOn,
});

describe("expired or unverified deadlines are never shown as actionable current deadlines", () => {
  it("a date in the past is closed, however recently it was checked", () => {
    expect(checkDeadline(deadline("2030-03-01", "2030-03-11"), "2030-03-12").state).toBe("closed");
  });

  it("a date ahead that was never checked is 'check the date', not open", () => {
    expect(checkDeadline(deadline("2030-03-30"), "2030-03-12").state).toBe("check-date");
  });

  it(`a date ahead last checked more than ${VERIFICATION_MAX_AGE_DAYS} days ago is 'check the date'`, () => {
    expect(checkDeadline(deadline("2030-03-30", "2030-02-12"), "2030-03-12").state).toBe(
      "check-date",
    );
    expect(checkDeadline(deadline("2030-03-30", "2030-02-25"), "2030-03-12").state).toBe(
      "check-date",
    ); // 15 days
    expect(checkDeadline(deadline("2030-03-30", "2030-02-26"), "2030-03-12").state).toBe("open"); // 14 days
  });

  it("a check dated after today can't count", () => {
    expect(checkDeadline(deadline("2030-03-30", "2030-03-20"), "2030-03-12").state).toBe(
      "check-date",
    );
  });

  it("a date ahead and recently checked is open, including on the day itself", () => {
    expect(checkDeadline(deadline("2030-03-12", "2030-03-11"), "2030-03-12")).toMatchObject({
      state: "open",
      daysLeft: 0,
    });
  });

  it("on the demo clock: only the two checked, future routes are actionable", () => {
    expect(
      actionableNow(ACTION_ROUTES, DEMO_CLOCK)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["speak-at-hearing", "statement-of-concern"]);
    const actions = getActions("corvane-meadowmere");
    expect(actions.checkDate.map((r) => r.id)).toEqual(["written-submission"]);
    expect(actions.closed.map((r) => r.id)).toEqual(["open-house-feedback"]);
  });

  it("the issue overview's 'upcoming point to take part' lists only actionable routes", () => {
    const ids = getIssue("corvane-meadowmere")!.actionableNow.map((r) => r.id);
    expect(ids).not.toContain("written-submission");
    expect(ids).not.toContain("open-house-feedback");
  });

  it("once the demo clock passes every deadline, nothing is actionable", () => {
    expect(actionableNow(ACTION_ROUTES, "2030-04-01")).toEqual([]);
  });
});
