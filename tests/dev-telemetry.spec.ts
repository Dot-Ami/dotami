import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Next.js and the Prisma CLI report usage on their own unless NEXT_TELEMETRY_DISABLED=1 and
 * CHECKPOINT_DISABLE=1 are set (scripts/telemetry-off.mjs says what each sends). These tests keep
 * the project's own npm scripts and CI from sending either, for anyone who runs DotAmi from source.
 */

const repo = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8")) as { scripts: Record<string, string> };

// The command each part of a script runs: "npx next start" and "next start" both run `next`.
function commandsIn(script: string): string[] {
  return script
    .split(/&&|\|\||;/)
    .map((part) => part.trim().split(/\s+/).filter((word) => word !== "npx")[0] ?? "")
    .filter(Boolean);
}

describe("the npm scripts run Next.js and Prisma with their usage reports off", () => {
  it("finds the scripts it is guarding (a renamed script can't slip past by being missed)", () => {
    // Positive first: these scripts exist and go through the wrappers.
    expect(pkg.scripts.dev).toContain("scripts/next.mjs");
    expect(pkg.scripts.build).toContain("scripts/next.mjs");
    expect(pkg.scripts["prisma:generate"]).toContain("scripts/prisma.mjs");
  });

  it("no script calls `next` or `prisma` directly", () => {
    const direct = Object.entries(pkg.scripts).filter(([, script]) =>
      commandsIn(script).some((command) => command === "next" || command === "prisma"),
    );
    expect(direct.map(([name, script]) => `${name}: ${script}`)).toEqual([]);
  });
});

describe("the wrappers hand both switches to the tool they start", () => {
  // A stand-in for each tool, in a copy of the scripts folder, so the test runs the real wrapper
  // code without starting Next.js or Prisma (and so can't send anything even if the switch broke).
  const sandbox = mkdtempSync(path.join(tmpdir(), "dotami-telemetry-"));
  afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

  mkdirSync(path.join(sandbox, "scripts"));
  for (const file of readdirSync(path.join(repo, "scripts")).filter((name) => name.endsWith(".mjs"))) {
    copyFileSync(path.join(repo, "scripts", file), path.join(sandbox, "scripts", file));
  }
  const standIn = `console.log(JSON.stringify({ next: process.env.NEXT_TELEMETRY_DISABLED ?? null, prisma: process.env.CHECKPOINT_DISABLE ?? null, args: process.argv.slice(2) })); process.exit(7);`;
  for (const cli of [["next", "dist", "bin", "next"], ["prisma", "build", "index.js"]]) {
    mkdirSync(path.join(sandbox, "node_modules", ...cli.slice(0, -1)), { recursive: true });
    writeFileSync(path.join(sandbox, "node_modules", ...cli), standIn);
  }

  // Started with both switches absent from the environment, as on a fresh computer.
  const env = { ...process.env };
  delete env.NEXT_TELEMETRY_DISABLED;
  delete env.CHECKPOINT_DISABLE;

  it.each([
    ["scripts/next.mjs", ["dev", "-H", "127.0.0.1"]],
    ["scripts/prisma.mjs", ["migrate", "deploy"]],
  ])("%s", (script, args) => {
    const run = spawnSync(process.execPath, [path.join(sandbox, script), ...args], { cwd: sandbox, env, encoding: "utf8" });
    // The stand-in ran with the arguments, and its exit code came back unchanged.
    expect(run.status).toBe(7);
    expect(JSON.parse(run.stdout.trim())).toEqual({ next: "1", prisma: "1", args });
  });
});

describe("CI runs with both switches off", () => {
  const workflows = path.join(repo, ".github", "workflows");

  // Each job of a workflow: the lines from "  name:" under jobs to the next one.
  function jobsOf(file: string): [string, string][] {
    const text = readFileSync(path.join(workflows, file), "utf8");
    const jobs = text.slice(text.indexOf("\njobs:"));
    return jobs
      .split(/\n(?=  [\w-]+:\s*\n)/)
      .slice(1)
      .map((block) => [block.trim().split(":")[0], block]);
  }

  const npmJobs = readdirSync(workflows)
    .filter((file) => file.endsWith(".yml"))
    .flatMap((file) => jobsOf(file).map(([job, block]) => ({ where: `${file} → ${job}`, block })))
    .filter(({ block }) => /\b(npm|npx)\s/.test(block));

  it("finds the jobs that install or run the project", () => {
    expect(npmJobs.map(({ where }) => where)).toEqual(
      expect.arrayContaining(["ci.yml → quality", "ci.yml → browser", "ci.yml → desktop", "release.yml → windows"]),
    );
  });

  it("sets NEXT_TELEMETRY_DISABLED and CHECKPOINT_DISABLE for every one of them", () => {
    const missing = npmJobs.filter(
      ({ block }) => !/NEXT_TELEMETRY_DISABLED: "1"/.test(block) || !/CHECKPOINT_DISABLE: "1"/.test(block),
    );
    expect(missing.map(({ where }) => where)).toEqual([]);
  });
});
