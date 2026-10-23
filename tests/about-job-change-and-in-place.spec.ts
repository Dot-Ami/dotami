/**
 * Task 28h (the phase 2 follow-up): About this job's region **Change** in the cockpit (docs/ui-spec/cockpit/
 * about-this-job.md, row 2; Alberta only, the eight regions and "I don't know", kept in `Venture.economicRegion`
 * with its day), and About this job's rows in place on step 3's no-road block (docs/ui-spec/futures/
 * 03-road-match.md, case B; task 28c), read on DotAmi's own server for the answers on screen, nothing kept.
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { POST as postAbout } from "@/app/api/jobs/about/route";
import { AboutThisJobPanel, AboutThisJobRows } from "@/components/cockpit/about-this-job-panel";
import { aboutJobForAnswers, aboutJobForFuture } from "@/lib/about-job/view";
import { aboutJobWords } from "@/lib/about-job/words";
import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseFirstSave } from "@/lib/db/parse-scenario-input";
import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import { readFuture } from "@/lib/futures/future";
import { changeRegion } from "@/lib/futures/region";
import { SHIPPED_ROADS_CATALOG } from "@/lib/futures/types";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";
import { findTimeWords } from "./helpers/time-words";
import { findVerdicts } from "./helpers/verdict-words";

const BARBERS = "63210.02";
const NOW = new Date("2026-10-22T12:00:00Z");

const ask = (body: unknown) =>
  postAbout(new Request("http://localhost/api/jobs/about", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

afterEach(() => __resetRateLimitStateForTests());

describe("About this job in place on step 3: the same view as the cockpit's panel, for the answers on screen", () => {
  it("answers the rows for the job, place, area and region as picked so far", async () => {
    const res = await ask({ job: BARBERS, province: "AB", area: "cma-825", region: "4830" });
    expect(res.status).toBe(200);
    const { aboutJob } = (await res.json()) as { aboutJob: ReturnType<typeof aboutJobForAnswers> };
    // The same view the cockpit builds for a saved future with those answers.
    expect(aboutJob).toEqual(
      aboutJobForFuture({ job: { code: BARBERS }, place: "CA-AB", area: { value: "cma-825" }, region: { value: "4830" } }),
    );
    expect(aboutJob!.wages.context).toEqual({ kind: "region", region: "Calgary" });
    expect(aboutJob!.area).toBe("Calgary");
  });

  it("never works the region out from the area: an area with no region reads as not picked", async () => {
    const { aboutJob } = (await (await ask({ job: BARBERS, province: "AB", area: "cma-825", region: null })).json()) as {
      aboutJob: NonNullable<ReturnType<typeof aboutJobForAnswers>>;
    };
    expect(aboutJob.wages.context).toEqual({ kind: "not-picked" });
  });

  it("outside Alberta: the place's own row, and no area or region read even when sent", async () => {
    const { aboutJob } = (await (await ask({ job: BARBERS, province: "ON", area: "cma-825", region: "4830" })).json()) as {
      aboutJob: NonNullable<ReturnType<typeof aboutJobForAnswers>>;
    };
    expect(aboutJob.wages.context.kind).toBe("outside-alberta");
    expect(aboutJob.area).toBeNull();
  });

  it("refuses what isn't a job, a place or a short answer", async () => {
    expect((await ask({ job: "99999.99", province: "AB", area: null, region: null })).status).toBe(404);
    expect((await ask({ job: BARBERS, province: "XX", area: null, region: null })).status).toBe(400);
    expect((await ask({ job: BARBERS, province: "AB", area: "x".repeat(40), region: null })).status).toBe(400);
    expect((await ask({ province: "AB" })).status).toBe(400);
  });

  it("the rows drawn in place have no Close and no panel heading of their own", () => {
    const view = aboutJobForAnswers({ job: BARBERS, province: "AB", area: null, region: null })!;
    const html = renderToStaticMarkup(createElement(AboutThisJobRows, { view }));
    expect(html).toContain(aboutJobWords.rules.heading);
    expect(html).toContain('data-about-row="wages"');
    expect(html).not.toContain(`aria-label="${aboutJobWords.close}"`);
    expect(html).not.toContain(`aria-label="${aboutJobWords.region}"`);
    // No Change where none is handed in (the steps change the region with their own back link).
    expect(html).not.toContain(aboutJobWords.wages.changeName);
  });
});

describe("About this job's region Change in the cockpit", () => {
  it("draws Change only in Alberta, and only when it can keep the answer", () => {
    const keep = async () => true;
    const ab = aboutJobForAnswers({ job: BARBERS, province: "AB", area: null, region: null })!;
    const on = aboutJobForAnswers({ job: BARBERS, province: "ON", area: null, region: null })!;
    const panel = (view: typeof ab, withChange: boolean) =>
      renderToStaticMarkup(createElement(AboutThisJobPanel, { view, onClose: () => {}, regionChange: withChange ? { current: null, keep } : undefined }));
    expect(panel(ab, true)).toContain(`>${aboutJobWords.wages.changeName}</button>`);
    expect(panel(ab, false)).not.toContain(aboutJobWords.wages.changeName);
    expect(panel(on, true)).not.toContain(aboutJobWords.wages.changeName);
  });

  it("its words carry no verdict and no time", () => {
    for (const line of [aboutJobWords.wages.changeName, aboutJobWords.wages.changeKeep, aboutJobWords.wages.changeCancel, aboutJobWords.wages.changeFailed]) {
      expect(findVerdicts(line), line).toEqual([]);
      expect(findTimeWords(line), line).toEqual([]);
    }
  });

  describe("in the data file", () => {
    const dbFile = path.join(tmpdir(), `dotami-region-change-${randomUUID()}.db`);
    let prisma: PrismaClient;
    beforeAll(() => {
      migratedFile(dbFile);
      prisma = createDatabaseClient({ url: fileUrl(dbFile) });
    }, 120_000);
    afterAll(async () => {
      await prisma?.$disconnect();
      for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
    });

    const idea = async (province: "AB" | "ON", answers: Record<string, string>) => {
      const scenario = { ...demoScenarios[0], id: `scenario-${randomUUID()}`, profile: { ...demoScenarios[0].profile, province } };
      const firstSave = parseFirstSave({ ...answers, roadId: generalRoadV2026.id }, NOW, province);
      return (await ensureVentureFromScenario(prisma, scenario, { ...firstSave, roadId: generalRoadV2026.id })).ventureId;
    };

    it("keeps a region, or I don't know, with its day; the same answer again keeps the first day", async () => {
      const id = await idea("AB", { job: BARBERS, area: "cma-825" });
      expect((await readFuture(prisma, id, SHIPPED_ROADS_CATALOG)).region).toBeNull();
      await changeRegion(prisma, id, "4830");
      const first = (await readFuture(prisma, id, SHIPPED_ROADS_CATALOG)).region;
      expect(first?.value).toBe("4830");
      expect(first?.setOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const row = await prisma.venture.findUniqueOrThrow({ where: { id }, select: { economicRegionSetAt: true, landscapeArea: true } });
      await changeRegion(prisma, id, "4830");
      const again = await prisma.venture.findUniqueOrThrow({ where: { id }, select: { economicRegionSetAt: true } });
      expect(again.economicRegionSetAt).toEqual(row.economicRegionSetAt);
      await changeRegion(prisma, id, "dont-know");
      expect((await readFuture(prisma, id, SHIPPED_ROADS_CATALOG)).region?.value).toBe("dont-know");
      // The area is never touched by the region's Change.
      expect(row.landscapeArea).toBe("cma-825");
      expect((await prisma.venture.findUniqueOrThrow({ where: { id }, select: { landscapeArea: true } })).landscapeArea).toBe("cma-825");
    });

    it("refuses a region off Alberta's list, and any region outside Alberta, keeping what was there", async () => {
      const id = await idea("AB", { job: BARBERS, region: "4860" });
      await expect(changeRegion(prisma, id, "5930")).rejects.toThrow();
      await expect(changeRegion(prisma, id, "")).rejects.toThrow();
      await expect(changeRegion(prisma, id, null)).rejects.toThrow();
      expect((await readFuture(prisma, id, SHIPPED_ROADS_CATALOG)).region?.value).toBe("4860");
      const ontario = await idea("ON", { job: BARBERS });
      await expect(changeRegion(prisma, ontario, "4830")).rejects.toThrow();
      expect((await prisma.venture.findUniqueOrThrow({ where: { id: ontario }, select: { economicRegion: true } })).economicRegion).toBeNull();
    });
  });
});
