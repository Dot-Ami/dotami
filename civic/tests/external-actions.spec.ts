import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";
import { ACTION_ROUTES } from "@/lib/demo/actions";
import { prepareHandoff, textFingerprint, type Approval } from "@/lib/rules/approval";

/**
 * External actions cannot happen without approval. Three layers, each tested:
 * the gate itself, the absence of any code that could send, and the browser policy.
 */
const route = ACTION_ROUTES.find((r) => r.id === "statement-of-concern")!;
const text =
  "To the Board, re file WERB-2030-0117. I live near the site. Please require upset-condition modelling.";
const approved = (t: string, over: Partial<Approval> = {}): Approval => ({
  routeId: route.id,
  confirmedDestination: true,
  confirmedText: true,
  fingerprint: textFingerprint(t),
  ...over,
});

describe("the approval gate", () => {
  it("refuses with no approval", () => {
    const result = prepareHandoff(route, text, null);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reasons).toContain("You haven't approved this text yet.");
  });

  it("refuses when either confirmation is missing", () => {
    expect(
      prepareHandoff(route, text, approved(text, { confirmedDestination: false })).allowed,
    ).toBe(false);
    expect(prepareHandoff(route, text, approved(text, { confirmedText: false })).allowed).toBe(
      false,
    );
  });

  it("refuses an approval given for a different route", () => {
    expect(
      prepareHandoff(route, text, approved(text, { routeId: "written-submission" })).allowed,
    ).toBe(false);
  });

  it("refuses when the text changed after approval, even by one character", () => {
    const result = prepareHandoff(route, `${text}!`, approved(text));
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reasons.join(" ")).toMatch(/changed after you approved/);
  });

  it("refuses a template with unfilled [placeholders], even when approved", () => {
    expect(
      prepareHandoff(route, route.draftTemplate!, approved(route.draftTemplate!)).allowed,
    ).toBe(false);
  });

  it("refuses text carrying someone's contact details, even when approved", () => {
    const t = `${text} Call the councillor at home on 555-201-3344.`;
    expect(prepareHandoff(route, t, approved(t)).allowed).toBe(false);
  });

  it("with a full approval, hands the text back to the person to send themselves, and has sent nothing", () => {
    const result = prepareHandoff(route, text, approved(text));
    expect(result).toEqual({
      allowed: true,
      handoff: {
        kind: "copy-and-send-yourself",
        destinationLabel: route.destinationLabel,
        text,
        sent: false,
      },
    });
  });
});

const ROOT = path.join(__dirname, "..");
function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir)).flatMap((name) => {
    const rel = path.join(dir, name);
    return statSync(path.join(ROOT, rel)).isDirectory()
      ? files(rel)
      : /\.(ts|tsx|mjs)$/.test(name)
        ? [rel]
        : [];
  });
}
const SOURCE_FILES = ["app", "components", "lib"].flatMap(files).concat(["middleware.ts"]);

describe("no code that could send anything", () => {
  it("reads the app's code (the scan isn't scanning nothing)", () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(30);
  });

  it("no network call to any other address, and no beacon, socket or form posting elsewhere", () => {
    const sending =
      /\bfetch\s*\(\s*["'`]https?:|XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource\s*\(|RTCPeerConnection|<form[^>]+action=["']https?:|mailto:|window\.open\s*\(/;
    const hits = SOURCE_FILES.filter((f) => sending.test(readFileSync(path.join(ROOT, f), "utf8")));
    expect(hits).toEqual([]);
  });

  it("the API is read-only: every route exports GET and no other method", () => {
    const routes = files("app/api").filter((f) => f.endsWith("route.ts"));
    expect(routes.length).toBeGreaterThanOrEqual(7);
    for (const f of routes) {
      const code = readFileSync(path.join(ROOT, f), "utf8");
      expect(code, f).toMatch(/export (async )?function GET/);
      expect(code, f).not.toMatch(
        /export (async )?function (POST|PUT|PATCH|DELETE)|export const (POST|PUT|PATCH|DELETE)/,
      );
    }
  });

  it("no server action exists ('use server' would add a write path)", () => {
    const hits = SOURCE_FILES.filter((f) =>
      /["']use server["']/.test(readFileSync(path.join(ROOT, f), "utf8")),
    );
    expect(hits).toEqual([]);
  });
});

describe("the browser policy blocks connections and form posts to other sites", () => {
  it("pages carry connect-src 'self' and form-action 'self'", () => {
    const response = middleware(
      new NextRequest("http://localhost:3200/", { headers: { host: "localhost:3200" } }),
    );
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("a request for another host name is refused before any page runs", () => {
    const response = middleware(
      new NextRequest("http://localhost:3200/", { headers: { host: "evil.example" } }),
    );
    expect(response.status).toBe(421);
  });
});
