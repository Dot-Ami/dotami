/**
 * Your plan's route (app/(journey)/plan/page.tsx; docs/ui-spec/plan/_index.md): what the page says when
 * there is no idea to show. An idea DotAmi keeps no record of and a data file that couldn't be read just
 * now are two different things, and the page must never tell the person their idea is gone when only the
 * read failed. The read itself is replaced here; nothing touches a database.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { readPlan } = vi.hoisted(() => ({ readPlan: vi.fn() }));
vi.mock("@/lib/futures/read-plan", () => ({ readPlan }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import PlanRoutePage from "@/app/(journey)/plan/page";
import { cockpitWords } from "@/lib/cockpit/words";

/** React's escaping of text. */
const esc = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

async function draw(venture?: string): Promise<string> {
  const page = await PlanRoutePage({ searchParams: Promise.resolve(venture === undefined ? {} : { venture }) });
  return renderToStaticMarkup(page);
}

describe("the plan page with nothing to draw", () => {
  let logged: ReturnType<typeof vi.spyOn>[] = [];
  beforeEach(() => {
    readPlan.mockReset();
    logged = [vi.spyOn(console, "error").mockImplementation(() => {}), vi.spyOn(console, "log").mockImplementation(() => {})];
  });
  afterEach(() => {
    for (const spy of logged) spy.mockRestore();
  });

  it("a failed read says the read failed and nothing was changed, never that the idea doesn't exist", async () => {
    readPlan.mockRejectedValue(new Error("SQLITE_BUSY: database is locked"));
    const html = await draw("v1");
    expect(html).toContain(esc(cockpitWords.plan.readFailed));
    expect(html).not.toContain(esc(cockpitWords.plan.notFound));
    // The way back to the same idea's cockpit.
    expect(html).toContain(`href="/cockpit?venture=v1"`);
    expect(html).toContain(`>${cockpitWords.plan.back}</a>`);
    // Nothing about the failure is written to the log.
    for (const spy of logged) expect(spy).not.toHaveBeenCalled();
  });

  it("no idea with that id says DotAmi keeps none (the control)", async () => {
    readPlan.mockResolvedValue(null);
    const html = await draw("no-such-idea");
    expect(html).toContain(esc(cockpitWords.plan.notFound));
    expect(html).not.toContain(esc(cockpitWords.plan.readFailed));
  });

  it("no id at all is the same as no idea, and nothing is read", async () => {
    const html = await draw();
    expect(html).toContain(esc(cockpitWords.plan.notFound));
    expect(readPlan).not.toHaveBeenCalled();
  });
});
