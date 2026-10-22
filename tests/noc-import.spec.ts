/**
 * The NOC 2021 import (task 28a): `scripts/import-noc.mjs` turns Statistics Canada's NOC 2021 Version 1.0
 * elements file, committed under data/noc-2021-v1.0/, into lib/engines/noc/v2021/data.ts: each five-digit job
 * group's title, its example titles and its "Employment requirements", the requirements word for word. These
 * tests redo the import on every run, refuse a module that isn't exactly what the file makes, and check every
 * requirement line against the screens' verdict check, so a re-pinned file can't bring a verdict in unseen.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NOC_ATTRIBUTION, NOC_LICENCE_URL, nocGroup, nocRequirements, nocTitles } from "@/lib/engines/noc/v2021";
import { nocData } from "@/lib/engines/noc/v2021/data";
import { oasisData } from "@/lib/engines/oasis/v2026/data";
import { SOURCES } from "@/lib/engines/research-kit/v2026/registry";

import { buildNocModule, main, NOC_DATA_DIR, NOC_FILES, NOC_MODULE_PATH, NOC_REFERENCE_PERIOD } from "../scripts/import-noc.mjs";
import { creditLine, evenText } from "../scripts/lib/import-kit.mjs";
import { OFFICIAL_QUOTE_ALLOWANCES, findVerdicts } from "./helpers/verdict-words";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const FILE = NOC_FILES[0]!;
const committed = () => read(path.join(NOC_DATA_DIR, FILE.name));

describe("the import can be redone", () => {
  it("turns the committed file into the committed module, byte for byte", () => {
    expect(buildNocModule({ elements: committed() })).toBe(read(NOC_MODULE_PATH).replace(/\r\n/g, "\n"));
  });

  it("reads the elements file Statistics Canada lists on the classification's page", () => {
    expect(FILE.name).toBe("noc-2021-v1.0-elements.csv");
    expect(FILE.url).toBe("https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv");
  });

  it("pins the file's SHA-256, of its text with the line endings evened out, and the module records the same", () => {
    const sha = createHash("sha256").update(evenText(committed()), "utf8").digest("hex");
    expect(FILE.sha256).toBe(sha);
    expect(nocData.files).toEqual([{ name: FILE.name, sha256: sha }]);
  });

  it("keeps all 516 job groups, one for every OaSIS job's first five digits and none without one", () => {
    expect(nocData.groups).toHaveLength(516);
    const groups = new Set(nocData.groups.map(([code]) => code));
    const jobGroups = new Set(oasisData.occupations.map(([code]) => code.slice(0, 5)));
    expect([...jobGroups].filter((g) => !groups.has(g))).toEqual([]);
    expect([...groups].filter((g) => !jobGroups.has(g))).toEqual([]);
  });

  it("keeps the three kinds of title and every requirement line, and nothing else", () => {
    const kinds = new Map<string, number>();
    for (const [, kind] of nocData.titles) kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    expect(Object.fromEntries(kinds)).toEqual({ illustrative: 4768, all: 27935, inclusion: 217 });
    expect(nocData.requirements).toHaveLength(2122);
    // Every group has at least one requirement line.
    expect(nocData.groups.filter(([code]) => nocRequirements(code).length === 0)).toEqual([]);
  });

  it("keeps the requirements word for word, double space included (72311 Cabinetmakers, as About this job's spec shows it)", () => {
    expect(nocGroup("72311.00")).toEqual({ code: "72311", title: "Cabinetmakers" });
    expect(nocRequirements("72311.00")).toEqual([
      "Completion of secondary school is usually required.",
      "Completion of a four-year apprenticeship program  or A combination of over four years of work experience in the trade and some high school or college courses in cabinetmaking is usually required to be eligible for trade certification.",
      "Trade certification is available, but voluntary, in all provinces and territories.",
      "Red Seal endorsement is also available to qualified cabinetmakers upon successful completion of the interprovincial Red Seal examination.",
    ]);
    // The lines naming each job of a two-job group stay where the file puts them.
    const hair = nocRequirements("63210.02");
    expect(hair[0]).toBe("Hairstylists");
    expect(hair).toContain("Barbers");
    // The no-break space in "one-year apprenticeship" is the file's, and is kept.
    expect(hair).toContain("Completion of a seven-month to one-year apprenticeship or other barber program is usually required.");
    expect(nocTitles("63210", "all")).toContain("beauty salon operator");
  });

  it("starts with Statistics Canada's notice, filled from the registry card, and says it is generated", () => {
    const card = SOURCES.find((c) => c.id === "noc-2021-elements")!;
    expect(creditLine(card, { referencePeriod: NOC_REFERENCE_PERIOD })).toBe(NOC_ATTRIBUTION);
    const text = read(NOC_MODULE_PATH);
    const head = text
      .split(/\r?\n/)
      .slice(0, 3)
      .map((l) => l.replace(/^\/\/ ?/, ""))
      .join(" ");
    expect(head).toContain(NOC_ATTRIBUTION);
    expect(head).toContain(NOC_LICENCE_URL);
    expect(text).toContain("Generated by scripts/import-noc.mjs");
    expect(read("lib/engines/noc/v2021/LICENCE.txt").replace(/\s+/g, " ")).toContain(NOC_ATTRIBUTION);
  });
});

/**
 * Requirement lines the screens' verdict check catches, which About this job (task 25h) may show only once each
 * has its official-quote allowance in tests/helpers/verdict-words.ts. The allowance is added with the panel
 * that shows the line, not here: e2e/no-verdict.spec.ts requires every allowance to be seen on a screen, and
 * no screen shows these lines yet (docs/ui-spec/cockpit/about-this-job.md, "How the quoted lines pass").
 */
const LINES_AWAITING_AN_ALLOWANCE = [
  ["53200", "A background combining athletic training and college or university studies is strongly recommended."],
];

describe("every requirement line against the screens' verdict check, as a quote", () => {
  it("catches only the line known to need an allowance (group 53200 Athletes: “strongly recommended”), so a new one can't come in unseen", () => {
    // Shown as About this job shows them: each line inside its own quote marks.
    const allowed = new Set(OFFICIAL_QUOTE_ALLOWANCES.map((a) => a.text));
    const caught = nocData.requirements.filter(([, line]) => findVerdicts(`“${line}”`).length > 0 && !allowed.has(line));
    expect(caught).toEqual(LINES_AWAITING_AN_ALLOWANCE);
    // The line is the government's, word for word, in its group.
    expect(nocRequirements("53200")).toContain(LINES_AWAITING_AN_ALLOWANCE[0]![1]);
  });
});

describe("the import's own rules, on tiny invented files", () => {
  const header = "﻿Level,Code - NOC 2021 V1.0,Class title,Element Type Label English,Element Description English";

  it("keeps titles and requirements, trims only the spaces the file leaves at the end, and leaves out duties and the rest", () => {
    const made = buildNocModule({
      elements: [
        header,
        "5,72311,Cabinetmakers,Illustrative example(s),cabinetmaker ",
        '5,72311,Cabinetmakers,All examples,"cabinetmaker, custom "',
        "5,72311,Cabinetmakers,Employment requirements,Completion of  secondary school. ",
        "5,72311,Cabinetmakers,Main duties,Build things. ",
      ].join("\r\n"),
    });
    expect(made).toContain('["72311", "Cabinetmakers"],');
    expect(made).toContain('["72311", "illustrative", "cabinetmaker"],');
    expect(made).toContain('["72311", "all", "cabinetmaker, custom"],');
    expect(made).toContain('["72311", "Completion of  secondary school."],');
    expect(made).not.toContain("Build things");
  });

  it("refuses another header, a code that isn't five digits, a group named two ways, an unknown kind, and an empty text", () => {
    const rows = (...lines: string[]) => ({ elements: [header, ...lines].join("\n") });
    expect(() => buildNocModule({ elements: "a,b,c,d,e\n5,72311,x,All examples,y\n" })).toThrow(/the header is/);
    expect(() => buildNocModule(rows("5,7231,Cabinetmakers,All examples,x"))).toThrow(/isn't a five-digit/);
    expect(() => buildNocModule(rows("5,72311,Cabinetmakers,All examples,x", "5,72311,Cabinet makers,All examples,y"))).toThrow(/is "Cabinetmakers" earlier/);
    expect(() => buildNocModule(rows("5,72311,Cabinetmakers,Wages,x"))).toThrow(/element kind "Wages"/);
    expect(() => buildNocModule(rows("5,72311,Cabinetmakers,Employment requirements,  "))).toThrow(/text is empty/);
  });
});

describe("--download keeps the file only when its fingerprint is the pinned one", () => {
  let scratch = "";
  afterEach(() => {
    vi.unstubAllGlobals();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    scratch = "";
  });
  const makeRoot = () => {
    scratch = mkdtempSync(path.join(os.tmpdir(), "noc-download-"));
    mkdirSync(path.join(scratch, path.dirname(NOC_MODULE_PATH)), { recursive: true });
    return scratch;
  };
  const run = async (dir: string) => {
    const lines: string[] = [];
    const code = await main(["--download"], { root: dir, log: (line) => lines.push(line) });
    return { code, said: lines.join("\n") };
  };
  const written = (dir: string) => {
    const data = path.join(dir, NOC_DATA_DIR);
    return existsSync(data) ? readdirSync(data) : [];
  };

  it("writes the file as the server sent it when it matches, then rebuilds the same module", async () => {
    const dir = makeRoot();
    const bytes = readFileSync(path.join(root, NOC_DATA_DIR, FILE.name));
    vi.stubGlobal("fetch", async (url: string) => (url === FILE.url ? new Response(new Uint8Array(bytes)) : new Response("", { status: 404 })));
    expect((await run(dir)).code).toBe(0);
    expect(readFileSync(path.join(dir, NOC_MODULE_PATH), "utf8")).toBe(read(NOC_MODULE_PATH).replace(/\r\n/g, "\n"));
  });

  it("writes nothing when the site answers with its security-check page instead of the file (as it did on 2026-10-21)", async () => {
    const dir = makeRoot();
    vi.stubGlobal("fetch", async () => new Response("<!DOCTYPE html><title>Vérification de sécurité / Security Check</title>", { status: 403 }));
    const { code, said } = await run(dir);
    expect(code).toBe(1);
    expect(written(dir)).toEqual([]);
    expect(said).toContain("noc-2021-v1.0-elements.csv: the server answered 403. Nothing was rebuilt.");
  });

  it("writes nothing when a page comes back with a 200 instead of the file", async () => {
    const dir = makeRoot();
    vi.stubGlobal("fetch", async () => new Response("<!DOCTYPE html><title>Security Check</title>"));
    const { code, said } = await run(dir);
    expect(code).toBe(1);
    expect(written(dir)).toEqual([]);
    expect(said).toContain(`expected ${FILE.sha256}`);
  });
});
