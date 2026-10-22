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
import { WAGE_DATA_DIR, WAGE_FILES, WAGE_MODULE_PATH } from "../scripts/import-job-bank-wages.mjs";
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

  /** A throwaway top folder holding every importer's files and module, as committed (OaSIS's, and the wage file's). */
  const copyRoot = () => {
    scratch = mkdtempSync(path.join(os.tmpdir(), "data-check-"));
    const sets = [
      { dataDir: OASIS_DATA_DIR, files: OASIS_FILES, modulePath: OASIS_MODULE_PATH },
      { dataDir: WAGE_DATA_DIR, files: WAGE_FILES, modulePath: WAGE_MODULE_PATH },
    ];
    for (const { dataDir, files, modulePath } of sets) {
      mkdirSync(path.join(scratch, dataDir), { recursive: true });
      mkdirSync(path.join(scratch, path.dirname(modulePath)), { recursive: true });
      for (const f of files) copyFileSync(path.join(root, dataDir, f.name), path.join(scratch, dataDir, f.name));
      copyFileSync(path.join(root, modulePath), path.join(scratch, modulePath));
    }
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
    expect(said).toContain("lib/engines/wages/v2026/data.ts is what the files in data/job-bank-wages-2025 make.");
    expect(said).toContain("data:check: every importer's files match their pins and rebuild its module exactly (2 importers).");
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
    expect(said).toContain("data:check: 1 of 2 importers failed: scripts/import-oasis.mjs.");
  });

  it("fails on one changed figure in the wage file, naming the file and its pin (2026-10-21)", async () => {
    const dir = copyRoot();
    const file = path.join(dir, WAGE_DATA_DIR, WAGE_FILES[0]!.name);
    const text = readFileSync(file, "utf8");
    // Cabinetmakers in Calgary's region: median 23 becomes 24.
    const row = "NOC_72311,Cabinetmakers,Ébénistes,AB,ER4830,Calgary,Calgary,18,23,30,";
    expect(text).toContain(row);
    writeFileSync(file, text.replace(row, row.replace(",18,23,30,", ",18,24,30,")));
    const { code, said } = await run(dir);
    expect(code).toBe(1);
    expect(said).toContain(`data/job-bank-wages-2025/${WAGE_FILES[0]!.name} is not the file pinned for it`);
    expect(said).toContain(`the pin in WAGE_FILES (scripts/import-job-bank-wages.mjs) is ${WAGE_FILES[0]!.sha256}`);
    expect(said).toContain("data:check: 1 of 2 importers failed: scripts/import-job-bank-wages.mjs.");
  });

  it("fails on one edited figure in the generated wage module", async () => {
    const dir = copyRoot();
    const module = path.join(dir, WAGE_MODULE_PATH);
    const text = readFileSync(module, "utf8");
    const row = '["72311","ER4830","18","23","30",';
    expect(text).toContain(row);
    writeFileSync(module, text.replace(row, '["72311","ER4830","18","24","30",'));
    const { code, said } = await run(dir);
    expect(code).toBe(1);
    expect(said).toContain("lib/engines/wages/v2026/data.ts is NOT what the files in data/job-bank-wages-2025 make.");
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
