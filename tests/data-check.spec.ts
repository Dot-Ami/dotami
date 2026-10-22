/**
 * `npm run data:check` (scripts/data-check.mjs): every importer's committed files checked against their pins and
 * its module rebuilt and compared, offline, inside `npm run ci:quality`. The planted drifts below are its
 * receipts: one changed byte in a pinned government file, and one edited line in a generated module, each make
 * it fail, naming what changed.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IMPORTERS, main } from "../scripts/data-check.mjs";
import { OASIS_DATA_DIR, OASIS_FILES, OASIS_MODULE_PATH } from "../scripts/import-oasis.mjs";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };

describe("npm run data:check", () => {
  it("runs every importer in scripts/", () => {
    const importers = readdirSync(path.join(root, "scripts"))
      .filter((name) => /^import-.*\.mjs$/.test(name))
      .map((name) => `scripts/${name}`);
    expect([...IMPORTERS].sort()).toEqual(importers.sort());
  });

  it("is a step of npm run ci:quality, and of the CI workflow's quality job", () => {
    expect(packageJson.scripts["data:check"]).toBe("node scripts/data-check.mjs");
    expect(packageJson.scripts["ci:quality"].split(" && ")).toContain("npm run data:check");
    expect(readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8")).toMatch(/run: npm run data:check/);
  });
});

describe("on a copy of the committed data", () => {
  let scratch = "";
  afterEach(() => {
    vi.unstubAllGlobals();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    scratch = "";
  });

  /** A throwaway top folder holding the OaSIS files and module, as committed. */
  const copyRoot = () => {
    scratch = mkdtempSync(path.join(os.tmpdir(), "data-check-"));
    mkdirSync(path.join(scratch, OASIS_DATA_DIR), { recursive: true });
    mkdirSync(path.join(scratch, path.dirname(OASIS_MODULE_PATH)), { recursive: true });
    for (const f of OASIS_FILES) copyFileSync(path.join(root, OASIS_DATA_DIR, f.name), path.join(scratch, OASIS_DATA_DIR, f.name));
    copyFileSync(path.join(root, OASIS_MODULE_PATH), path.join(scratch, OASIS_MODULE_PATH));
    return scratch;
  };
  const run = async (dir: string) => {
    const lines: string[] = [];
    const code = await main({ root: dir, log: (line) => lines.push(line) });
    return { code, said: lines.join("\n") };
  };

  it("passes, without the network", async () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("data:check must not fetch");
    });
    const { code, said } = await run(copyRoot());
    expect(code).toBe(0);
    expect(said).toContain("lib/engines/oasis/v2026/data.ts is what the files in data/oasis-2025-v1.0 make.");
    expect(said).toContain("data:check: every importer's files match their pins and rebuild its module exactly (1 importer).");
  });

  it("fails on one changed byte in a pinned data file, naming the file and its pin", async () => {
    const dir = copyRoot();
    const labels = path.join(dir, OASIS_DATA_DIR, "labels_oasis_2025_v1.1.csv");
    const bytes = readFileSync(labels);
    // "Cabinetmakers" becomes "Cabinetmakerz": one byte.
    const at = bytes.indexOf("Cabinetmakers") + "Cabinetmaker".length;
    bytes[at] = "z".charCodeAt(0);
    writeFileSync(labels, bytes);
    const { code, said } = await run(dir);
    expect(code).toBe(1);
    expect(said).toContain("data/oasis-2025-v1.0/labels_oasis_2025_v1.1.csv is not the file pinned for it");
    expect(said).toContain(`the pin in OASIS_FILES (scripts/import-oasis.mjs) is ${OASIS_FILES.find((f) => f.key === "labels")!.sha256}`);
    expect(said).toContain("data:check: 1 of 1 importers failed: scripts/import-oasis.mjs.");
  });

  it("fails on one edited line in the generated module", async () => {
    const dir = copyRoot();
    const module = path.join(dir, OASIS_MODULE_PATH);
    const text = readFileSync(module, "utf8");
    expect(text).toContain('"72311.00", "Cabinetmakers"');
    writeFileSync(module, text.replace('"72311.00", "Cabinetmakers"', '"72311.00", "Cabinet makers"'));
    const { code, said } = await run(dir);
    expect(code).toBe(1);
    expect(said).toContain("lib/engines/oasis/v2026/data.ts is NOT what the files in data/oasis-2025-v1.0 make.");
  });

  it("fails when a pinned file is missing", async () => {
    const dir = copyRoot();
    rmSync(path.join(dir, OASIS_DATA_DIR, "skills_oasis_2025_v1.1.csv"));
    const { code, said } = await run(dir);
    expect(code).toBe(1);
    expect(said).toContain("data/oasis-2025-v1.0/skills_oasis_2025_v1.1.csv couldn't be read");
  });
});
