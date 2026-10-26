import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GET as index } from "@/app/api/v0/route";
import { GET as claim } from "@/app/api/v0/claims/[claimId]/route";
import { GET as issues } from "@/app/api/v0/issues/route";
import { GET as issue } from "@/app/api/v0/issues/[issueId]/route";
import { GET as actions } from "@/app/api/v0/issues/[issueId]/actions/route";
import { GET as timeline } from "@/app/api/v0/issues/[issueId]/timeline/route";
import { GET as source } from "@/app/api/v0/sources/[sourceId]/route";
import { DEMO_CLOCK } from "@/lib/demo/world";
import { ALL } from "@/lib/query";

/** Demo content is unmistakably labelled: in the data, on every page, and in every API answer. */
describe("demo content is unmistakably labelled", () => {
  it("every record that can stand alone carries fictional: true", () => {
    for (const list of [ALL.ISSUES, ALL.SOURCES, ALL.ENTITIES, ALL.JURISDICTIONS]) {
      for (const item of list) expect(item.fictional, item.id).toBe(true);
    }
  });

  it("every place, body and organisation name says it is fictional", () => {
    for (const item of [...ALL.ENTITIES, ...ALL.JURISDICTIONS])
      expect(item.name, item.id).toMatch(/fictional/);
  });

  it("no source has a real web address: every one is demo://", () => {
    for (const s of ALL.SOURCES) expect(s.originalUrl, s.id).toMatch(/^demo:\/\//);
  });

  it("the demo timeline sits in 2030, so no date can pass for a current, real one", () => {
    expect(DEMO_CLOCK.startsWith("2030-")).toBe(true);
    for (const r of ALL.ACTION_ROUTES)
      if (r.deadline) expect(r.deadline.date >= "2029-01-01", r.id).toBe(true);
  });

  it("the banner is in the root layout, so it is on every page, and it can't be dismissed", () => {
    const layout = readFileSync(path.join(__dirname, "..", "app", "layout.tsx"), "utf8");
    expect(layout).toContain("<DemoBanner />");
    const banner = readFileSync(
      path.join(__dirname, "..", "components", "demo-banner.tsx"),
      "utf8",
    );
    expect(banner).not.toMatch(/onClick|useState|<button/);
  });

  it("every API answer says demo: true and carries the notice and the demo clock", async () => {
    const p = <T>(value: T) => ({ params: Promise.resolve(value) });
    const req = new Request("http://localhost/api/v0/issues?q=air");
    const answers = await Promise.all([
      index(),
      issues(req),
      issue(req, p({ issueId: "corvane-meadowmere" })),
      timeline(req, p({ issueId: "corvane-meadowmere" })),
      actions(req, p({ issueId: "corvane-meadowmere" })),
      claim(req, p({ claimId: "emissions-safe" })),
      source(req, p({ sourceId: "air-assessment" })),
      issue(req, p({ issueId: "no-such-issue" })),
    ]);
    for (const answer of answers) {
      const body = await answer.json();
      expect(body.demo).toBe(true);
      expect(body.notice).toMatch(/invented/);
    }
    expect((await (await issues(req)).json()).demoClock).toBe(DEMO_CLOCK);
  });
});
