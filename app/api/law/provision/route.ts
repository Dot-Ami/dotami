import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * S2.5.4i — "show me the words". GET /api/law/provision?source=ita&label=20&sub=(1)(a)
 *
 * Runs the law store's own `contract/lookup.py` (the optional statute store, docs/architecture/law-store.md) and returns its JSON: the
 * provision's text, currency date and provenance, plus a best-effort sub-path snippet with
 * `focus.found`. Goes THROUGH the store's contract (charter: never its SQLite directly). Local
 * only — `LAW_STORE_PATH` names the store; when it is unset or missing this says so and
 * the citation stays a link. Results are cached per process: statute text does not change
 * between deploys of a consolidated Act, and the store's currency date rides along anyway.
 */

const SOURCES = new Set(["ita", "itr", "cbca", "abca"]);
const LABEL_RE = /^[A-Za-z0-9.\- ]{1,40}$/;
const SUB_RE = /^(\([0-9a-z.]{1,8}\)){1,4}$/;
const TIMEOUT_MS = 20_000;

const cache = new Map<string, unknown>();

function storePath(): string | null {
  const base = process.env.LAW_STORE_PATH?.trim();
  if (!base) return null;
  const script = path.join(base, "contract", "lookup.py");
  return existsSync(script) ? script : null;
}

function runLookup(script: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("python", [script, ...args], {
      cwd: path.dirname(script),
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: String(error) });
    });
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source")?.trim() ?? "";
  const label = url.searchParams.get("label")?.trim() ?? "";
  const sub = url.searchParams.get("sub")?.trim() ?? "";

  if (!SOURCES.has(source)) return NextResponse.json({ error: "source must be ita, itr, cbca or abca" }, { status: 400 });
  if (!LABEL_RE.test(label)) return NextResponse.json({ error: "label is required (letters, digits, dots, spaces)" }, { status: 400 });
  if (sub && !SUB_RE.test(sub)) return NextResponse.json({ error: "sub must look like (1)(a)" }, { status: 400 });

  const script = storePath();
  if (!script) {
    return NextResponse.json(
      { found: false, reason: "Law store not reachable from this machine (LAW_STORE_PATH unset or lookup.py missing). The citation link still works." },
      { status: 503 },
    );
  }

  const key = `${source}|${label}|${sub}`;
  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached, { headers: { "X-Law-Cache": "hit" } });

  const args = ["--source", source, "--label", label, ...(sub ? ["--sub", sub] : [])];
  const { code, stdout, stderr } = await runLookup(script, args);

  let body: { found?: boolean; reason?: string } & Record<string, unknown>;
  try {
    body = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
  } catch {
    console.error("[law/provision] unparseable", { code, stderr: stderr.slice(0, 500) });
    return NextResponse.json({ found: false, reason: "The law store answered but not in a form the app could read." }, { status: 502 });
  }

  if (body.found) cache.set(key, body);
  return NextResponse.json(body, { status: body.found ? 200 : 404, headers: { "X-Law-Cache": "miss" } });
}
