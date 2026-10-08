/**
 * [8f] Read last year's return: a PDF in, each T2125's lines 8299, 9368, 9369 and 9946 out, with
 * their pages, or a plain refusal. Nothing proposed, nothing kept.
 *
 * These run the real pdf.js (the same package and build the app ships) in Node, on PDFs built in
 * code (tests/helpers/make-pdf.ts) and laid out like the CRA's own T2125
 * (tests/fixtures/returns/cra-layout.ts). Every PDF and every amount is invented.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { extractPageText, PDF_OPTIONS, type PdfJs } from "@/lib/figures/return/extract";
import { findT2125Copies } from "@/lib/figures/return/find-lines";
import { T2125_LINES } from "@/lib/figures/return/lines";
import { interpret } from "@/lib/figures/return/read-pdf";
import { REFUSALS } from "@/lib/figures/return/refusals";
import { sniffPdf } from "@/lib/figures/return/sniff";
import { MAX_RETURN_BYTES, MAX_RETURN_PAGES, type ReturnReadResult, type TextItem } from "@/lib/figures/return/types";
import { INVENTED_AMOUNTS, otherFormPage, t2125Pages } from "./fixtures/returns/cra-layout";
import { makePdf, type PdfPage } from "./helpers/make-pdf";

// The app's worker does exactly this (lib/figures/return/pdf-text.worker.ts): pdf.js runs its
// parser in place instead of starting a worker of its own.
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

const root = path.resolve(__dirname, "..");

async function read(pages: PdfPage[], options?: Parameters<typeof makePdf>[1]): Promise<ReturnReadResult> {
  return interpret(await extractPageText(pdfjs, makePdf(pages, options)));
}

/** "8299 p2 48,250.00" for each place a line is printed, to compare a whole copy at a glance. */
function summary(result: ReturnReadResult): string[][] {
  if (!result.ok) throw new Error(`expected a read, got the refusal "${result.code}"`);
  return result.copies.map((copy) =>
    copy.lines.flatMap((l) =>
      l.occurrences.length === 0
        ? [`${l.line} missing`]
        : l.occurrences.map((o) => `${l.line} p${o.page} ${o.printed ?? "(blank)"}`),
    ),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("the invented test PDFs are real PDFs", () => {
  it("a locked one opens with its password and not without (so the refusal test is testing a real lock)", async () => {
    const bytes = makePdf([{ texts: [{ x: 50, y: 700, text: "T2125 E (25)" }] }], { userPassword: "invented" });
    const task = pdfjs.getDocument({ data: bytes.slice(), password: "invented", verbosity: 0 });
    const text = await (await (await task.promise).getPage(1)).getTextContent();
    expect(text.items.map((i) => ("str" in i ? i.str : ""))).toContain("T2125 E (25)");
    await task.destroy();
    await expect(pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise).rejects.toMatchObject({
      name: "PasswordException",
    });
  });

  it("text comes back where it was put, so the layout tests mean what they say", async () => {
    const result = await extractPageText(pdfjs, makePdf([{ texts: [{ x: 484.2, y: 274, text: "8299" }] }]));
    expect(result).toMatchObject({ ok: true, pages: [{ page: 1, items: [{ text: "8299", x: 484.2, y: 274 }] }] });
  });
});

describe("a return laid out like the CRA's T2125", () => {
  it("shows each of the four lines with its page and the amount printed beside it", async () => {
    const result = await read([
      otherFormPage("Income Tax and Benefit Return", "5000-R"),
      ...t2125Pages({ amounts: INVENTED_AMOUNTS }),
      otherFormPage("Schedule 8", "5000-S8"),
    ]);
    expect(result).toMatchObject({ ok: true, pageCount: 5, copies: [{ firstPage: 2, lastPage: 4 }] });
    expect(summary(result)).toEqual([
      ["8299 p3 48,250.00", "9368 p4 12,730.45", "9369 p4 35,519.55", "9946 p4 33,019.55"],
    ]);
    if (!result.ok) return;
    expect(result.copies[0].lines.map((l) => l.occurrences[0]?.cents)).toEqual([4825000, 1273045, 3551955, 3301955]);
  });

  it("never reads a sentence that mentions a line as the line itself", async () => {
    // Page 3 of the form says "Gross business income (line 8299 of Part 3C)" and "(line 8299 of Part
    // 3C) or"; page 2 says "...from line 8299 on the applicable line...". Only page 2's box counts.
    const result = await read(t2125Pages({ amounts: INVENTED_AMOUNTS }));
    if (!result.ok) throw new Error("not read");
    expect(result.copies[0].lines.find((l) => l.line === "8299")?.occurrences).toEqual([
      { page: 2, printed: "48,250.00", cents: 4825000 },
    ]);
  });

  it("takes the amount on the line's own row, not the line above or below it", async () => {
    // 8000 sits right above 8299 and 9945 right above 9946, each with an amount of its own.
    const result = await read(
      t2125Pages({ amounts: { "8000": "99,999.99", "8299": "1.00", "9945": "77.77", "9946": "2.00" } }),
    );
    expect(summary(result)).toEqual([["8299 p2 1.00", "9368 p3 (blank)", "9369 p3 (blank)", "9946 p3 2.00"]]);
  });

  it("an empty box is shown as nothing beside the line, never as zero", async () => {
    const result = await read(t2125Pages({ amounts: { "8299": "48,250.00" } }));
    if (!result.ok) throw new Error("not read");
    const lines = result.copies[0].lines;
    expect(lines.find((l) => l.line === "9368")?.occurrences).toEqual([{ page: 3, printed: null, cents: null }]);
    expect(lines.find((l) => l.line === "9946")?.occurrences).toEqual([{ page: 3, printed: null, cents: null }]);
  });

  it("a middle-column line stops at the next box's letter instead of borrowing its amount", async () => {
    // 9270's amount is in the middle box; 9368 below it is empty and must stay empty.
    const result = await read(t2125Pages({ amounts: { "9270": "1,230.45" } }));
    if (!result.ok) throw new Error("not read");
    expect(result.copies[0].lines.find((l) => l.line === "9368")?.occurrences[0].printed).toBeNull();
  });

  it("reads a loss, dollars and cents printed in two boxes, and an amount a little off the line", async () => {
    const result = await read(
      t2125Pages({
        amounts: {
          "8299": { dollars: "48,250", cents: "00" },
          "9368": "$51,450.00",
          "9369": "(3,200.00)",
          "9946": "-3,200.00",
        },
        amountDrop: 3,
      }),
    );
    expect(summary(result)).toEqual([
      ["8299 p2 48,250.00", "9368 p3 $51,450.00", "9369 p3 (3,200.00)", "9946 p3 -3,200.00"],
    ]);
    if (!result.ok) return;
    expect(result.copies[0].lines.map((l) => l.occurrences[0].cents)).toEqual([4825000, 5145000, -320000, -320000]);
  });

  it("two businesses: each T2125 is shown on its own, with its own pages", async () => {
    const result = await read([
      otherFormPage("Income Tax and Benefit Return", "5000-R"),
      ...t2125Pages({ amounts: INVENTED_AMOUNTS }),
      ...t2125Pages({ amounts: { "8299": "9,000.00", "9368": "1,000.00", "9369": "8,000.00", "9946": "8,000.00" } }),
    ]);
    expect(result).toMatchObject({
      ok: true,
      copies: [
        { firstPage: 2, lastPage: 4 },
        { firstPage: 5, lastPage: 7 },
      ],
    });
    expect(summary(result)).toEqual([
      ["8299 p3 48,250.00", "9368 p4 12,730.45", "9369 p4 35,519.55", "9946 p4 33,019.55"],
      ["8299 p6 9,000.00", "9368 p7 1,000.00", "9369 p7 8,000.00", "9946 p7 8,000.00"],
    ]);
  });

  it("a T2125 whose lines can't be found still shows, with each line marked missing", async () => {
    const result = await read([{ texts: [{ x: 21, y: 23.6, text: "T2125 E (25)" }] }]);
    expect(summary(result)).toEqual([["8299 missing", "9368 missing", "9369 missing", "9946 missing"]]);
  });
});

describe("plain refusals", () => {
  it("a scanned or photographed return: pictures, no text", async () => {
    expect(await read([{ picture: true }, { picture: true }])).toEqual({
      ok: false,
      code: "pictures-only",
      error: REFUSALS["pictures-only"],
    });
  });

  it("a password-locked PDF is refused without asking for the password", async () => {
    const result = await read(t2125Pages({ amounts: INVENTED_AMOUNTS }), { userPassword: "invented" });
    expect(result).toEqual({ ok: false, code: "password", error: REFUSALS.password });
  });

  it("a return without a T2125 says so, and points a short summary to the full save", async () => {
    const result = await read([otherFormPage("Income Tax and Benefit Return", "5000-R")]);
    expect(result).toEqual({ ok: false, code: "no-t2125", error: REFUSALS["no-t2125"] });
    expect(REFUSALS["no-t2125"]).toContain("Save PDF on the Submit page");
  });

  it("line numbers on a page that isn't a T2125 are not read as one", async () => {
    const page: PdfPage = { texts: [{ x: 484.2, y: 274, text: "8299" }, { x: 520, y: 274, text: "1.00" }] };
    expect(await read([page])).toMatchObject({ ok: false, code: "no-t2125" });
  });

  it("something that only starts like a PDF is refused, never half-read", async () => {
    const result = interpret(await extractPageText(pdfjs, new TextEncoder().encode("%PDF-1.4\nnot really")));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(["not-pdf", "failed"]).toContain(result.code);
    const cut = makePdf(t2125Pages({ amounts: INVENTED_AMOUNTS })).subarray(0, 300);
    expect(interpret(await extractPageText(pdfjs, cut.slice()))).toMatchObject({ ok: false });
  });

  it(`more than ${MAX_RETURN_PAGES} pages is refused before any page is read`, async () => {
    const pages: PdfPage[] = Array.from({ length: MAX_RETURN_PAGES + 1 }, () => ({}));
    expect(await read(pages)).toMatchObject({ ok: false, code: "too-many-pages" });
  });

  it("every refusal is a sentence that says nothing was kept", () => {
    for (const [code, sentence] of Object.entries(REFUSALS)) {
      expect(sentence, code).toMatch(/Nothing from it was kept\.$/);
    }
  });
});

describe("the signature check, before the reader loads", () => {
  const text = (s: string) => new TextEncoder().encode(s);
  it("reads the content, not the name: a PDF is a PDF, a picture is not", () => {
    expect(sniffPdf(5000, text("%PDF-1.7\n"))).toEqual({ ok: true });
    expect(sniffPdf(5000, Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({
      ok: false,
      code: "not-pdf",
    });
  });
  it("accepts the signature after a little junk, as PDF readers do, but not past 1 KB", () => {
    expect(sniffPdf(5000, text(`${" ".repeat(100)}%PDF-1.4`))).toEqual({ ok: true });
    expect(sniffPdf(5000, text(`${" ".repeat(1100)}%PDF-1.4`))).toEqual({ ok: false, code: "not-pdf" });
  });
  it("refuses an empty file and one over the limit without reading it", () => {
    expect(sniffPdf(0, new Uint8Array(0))).toEqual({ ok: false, code: "empty" });
    expect(sniffPdf(MAX_RETURN_BYTES + 1, text("%PDF-1.7"))).toEqual({ ok: false, code: "too-big" });
    expect(sniffPdf(MAX_RETURN_BYTES, text("%PDF-1.7"))).toEqual({ ok: true });
  });
});

describe("finding the lines, from text runs alone", () => {
  const run = (text: string, x: number, y: number, width = text.length * 4.4): TextItem => ({ text, x, y, width, height: 8 });
  const code = run("T2125 E (25)", 21, 23.6);

  it("a line printed with its amount in one run counts", () => {
    const copies = findT2125Copies([{ page: 1, items: [code, run("8299 48,250.00", 470, 274)] }]);
    expect(copies[0].lines[0].occurrences).toEqual([{ page: 1, printed: "48,250.00", cents: 4825000 }]);
  });

  it('"line" and the number as two runs is a mention, not the line', () => {
    const copies = findT2125Copies([{ page: 1, items: [code, run("line", 200, 274, 14), run("8299", 215, 274), run("5.00", 300, 274)] }]);
    expect(copies[0].lines[0].occurrences).toEqual([]);
  });

  it("stops at the next line number on the row instead of taking its amount", () => {
    const copies = findT2125Copies([
      { page: 1, items: [code, run("9368", 382.2, 277), run("9369", 484.2, 277), run("5.00", 520, 277)] },
    ]);
    expect(copies[0].lines.find((l) => l.line === "9368")?.occurrences[0].printed).toBeNull();
    expect(copies[0].lines.find((l) => l.line === "9369")?.occurrences[0].printed).toBe("5.00");
  });

  it("a word in the box is not an amount, and nothing further right is taken instead", () => {
    const copies = findT2125Copies([{ page: 1, items: [code, run("8299", 484.2, 274), run("see note", 505, 274), run("5.00", 560, 274)] }]);
    expect(copies[0].lines[0].occurrences[0]).toEqual({ page: 1, printed: null, cents: null });
  });

  it("the four lines are 8299, 9368, 9369 and 9946, in that order, with the CRA's words", () => {
    expect(T2125_LINES.map((l) => `${l.line} ${l.label}`)).toEqual([
      "8299 Gross business or professional income",
      "9368 Total expenses",
      "9369 Net income (loss) before adjustments",
      "9946 Your net income (loss)",
    ]);
  });
});

describe("pdf.js never downloads or runs anything", () => {
  it("is given every switch off, and no address to read from", async () => {
    let given: Record<string, unknown> | null = null;
    const watching = {
      ...pdfjs,
      getDocument: (params: Record<string, unknown>) => {
        given = params;
        return pdfjs.getDocument(params);
      },
    } as unknown as PdfJs;
    await extractPageText(watching, makePdf(t2125Pages()));
    expect(given).toMatchObject({
      isEvalSupported: false,
      enableXfa: false,
      disableFontFace: true,
      useSystemFonts: false,
      useWorkerFetch: false,
      useWasm: false,
      verbosity: 0,
    });
    for (const key of ["url", "cMapUrl", "standardFontDataUrl", "wasmUrl", "iccUrl", "docBaseUrl", "password", "httpHeaders", "range"]) {
      expect(given, key).not.toHaveProperty(key);
    }
  });

  it("asks for the standard font's data, gets nothing, and still reads every word — with no request made", async () => {
    // The test PDFs use Helvetica without embedding it, so pdf.js wants the standard font file.
    const asked: string[] = [];
    class Counting extends PDF_OPTIONS.BinaryDataFactory {
      override async fetch(...args: unknown[]): Promise<never> {
        const [{ kind }] = args as [{ kind: string }];
        asked.push(kind);
        return super.fetch();
      }
    }
    const withCounting = {
      ...pdfjs,
      getDocument: (params: Record<string, unknown>) => pdfjs.getDocument({ ...params, BinaryDataFactory: Counting }),
    } as unknown as PdfJs;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = interpret(await extractPageText(withCounting, makePdf(t2125Pages({ amounts: INVENTED_AMOUNTS }))));
    expect(summary(result)[0]).toContain("8299 p2 48,250.00");
    expect(asked).toContain("standardFontDataUrl");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("the package underneath: pdfjs-dist, as reviewed", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8")) as {
    packages: Record<string, { version: string; integrity: string }>;
  };
  const build = (file: string) => readFileSync(path.join(root, "node_modules/pdfjs-dist/legacy/build", file));
  const sha = (file: string) => createHash("sha256").update(build(file)).digest("hex");

  it("is pinned to the exact version that was read, which is past every known advisory", () => {
    // GHSA-hq66-cqwq-w95j (2026, scripting) is fixed in 6.2.108; CVE-2024-4367 (fonts) in 4.2.67.
    expect(pkg.dependencies["pdfjs-dist"]).toBe("6.4.299");
    expect(lock.packages["node_modules/pdfjs-dist"].version).toBe("6.4.299");
    expect(lock.packages["node_modules/pdfjs-dist"].integrity).toBe(
      "sha512-AVl138zALtfaAPvADulE0PZThbYzCBS79nL4pOSL/6Sm/4AH5A21BD9VHt97OlCuzJuCpmeZtAtkinisF4Vb1g==",
    );
  });

  it("ships the two files that were reviewed, unchanged", () => {
    expect(sha("pdf.mjs")).toBe("bc51f4874a66e3853189cb5d50aba4b3096afa83ed433b885d293a3d94583cdc");
    expect(sha("pdf.worker.mjs")).toBe("bb422f60804477de4a0b09091d8347a916a387755ed1cbad24ccaec1d09c78bf");
  });

  it("has no eval and no code-from-text left (the path CVE-2024-4367 used), bar one unreachable fallback", () => {
    // Built from pieces so this file doesn't itself spell the calls it looks for.
    const constructorCall = new RegExp(["\\bnew", "Function\\s*\\("].join("\\s+"));
    const bareCall = new RegExp(["(^|[^.\\w])", "Function\\s*\\("].join(""), "g");
    // core-js (the legacy build's polyfills) finds the global object with this line; its first
    // test, `typeof globalThis == 'object'`, is true in every browser and worker DotAmi runs in, so
    // the call at its end is never reached. Under the worker's policy (no 'unsafe-eval') it would
    // throw if it ever were.
    const fallback = ["(function () { return this; })() || ", "Function('return this')();"].join("");
    for (const file of ["pdf.mjs", "pdf.worker.mjs"]) {
      const code = build(file).toString("utf8");
      expect(code, file).not.toMatch(/\beval\s*\(/);
      expect(code, file).not.toMatch(constructorCall);
      expect(code.match(bareCall)?.length, file).toBe(1);
      expect(code.split(fallback).length - 1, file).toBe(1);
    }
  });

  it("is imported only by the return reader's own two files", () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|mjs|js)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
          if (/from "pdfjs-dist|import\("pdfjs-dist/.test(readFileSync(full, "utf8"))) {
            importers.push(path.relative(root, full).split(path.sep).join("/"));
          }
        }
      }
    };
    for (const dir of ["app", "components", "lib", "desktop"]) walk(path.join(root, dir));
    expect(importers.sort()).toEqual(["lib/figures/return/extract.ts", "lib/figures/return/pdf-text.worker.ts"]);
  });
});
