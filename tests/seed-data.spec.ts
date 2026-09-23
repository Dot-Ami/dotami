/**
 * The demo ventures `npm run seed` loads are checked here without a database, so a catalog
 * change that renames a node id fails the gate instead of failing a contributor's first run.
 */
import { describe, expect, it } from "vitest";

import { DEMO_LINK, DEMO_STATEMENT, demoScenarios } from "../prisma/seed-data";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { PROVINCES, VENTURE_STAGES } from "@/lib/scenarios/types";

const nodeIds = new Set(cfeCatalogV2026.nodes.map((n) => n.id));

describe("demo seed data", () => {
  it("loads exactly two ventures, both obviously demo", () => {
    expect(demoScenarios).toHaveLength(2);
    for (const s of demoScenarios) {
      expect(s.id.startsWith("demo-"), `${s.id} must start with demo-`).toBe(true);
      expect(s.profile.name.startsWith("Demo — "), `${s.profile.name} must be labelled Demo`).toBe(true);
    }
  });

  it("every branch pick is a real lifecycle node", () => {
    for (const s of demoScenarios) {
      for (const [decision, picked] of Object.entries(s.state.activeBranches)) {
        expect(nodeIds.has(picked), `${s.id}.${decision} -> ${picked} is not a node id`).toBe(true);
      }
      for (const id of s.state.activeNodeIds) {
        expect(nodeIds.has(id), `${s.id} active node ${id} is not a node id`).toBe(true);
      }
    }
  });

  it("every province and stage is real", () => {
    for (const s of demoScenarios) {
      expect(PROVINCES).toContain(s.profile.province);
      if (s.profile.stage) expect(VENTURE_STAGES).toContain(s.profile.stage);
    }
  });

  it("the cross-reference joins two ventures that exist", () => {
    const ids = demoScenarios.map((s) => s.id);
    expect(ids).toContain(DEMO_LINK.fromId);
    expect(ids).toContain(DEMO_LINK.toId);
    expect(DEMO_LINK.fromId).not.toBe(DEMO_LINK.toId);
  });

  it("the demo statement carries a real date, not a generated profile", () => {
    expect(DEMO_STATEMENT.saidAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(DEMO_STATEMENT.saidAt))).toBe(false);
    expect(DEMO_STATEMENT.text.length).toBeGreaterThan(10);
  });
});
