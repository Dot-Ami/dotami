/**
 * What six routes answer, pinned before the route helpers moved into lib/api/route.ts (house-cleaning
 * audit of 2026-10-31, item architecture-6) and kept passing after: the status, every header and the
 * whole body, for a body that isn't JSON (and the other refusals the body guard makes), a caller past
 * the rate limit, a request from outside DotAmi's window where the route answers only that window, the
 * store's own refusals, and a request that works. One route per domain whose http.ts lost its copies
 * (figures, futures, expenses, landscape), then all nine routes that counted their rate limit by hand:
 * settings and the intent parser (whose body-reading words differ: "Invalid JSON payload") in full, the
 * other seven more briefly.
 *
 * The answers that work carry ids and moments that change every run, so those are replaced by
 * placeholders before the comparison; everything else must match to the character. Then each domain's
 * error mapper is given an error none of its classes match, and its 503 and its one log line are pinned.
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __resetRateLimitStateForTests, E2E_RATE_LIMITS_ENV } from "@/lib/api/rate-limit";
import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { localToday } from "@/lib/figures/age";
import { LAUNCH_SECRET_ENV } from "@/lib/http/launch-secret";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

const dbFile = path.join(tmpdir(), `dotami-route-answers-${randomUUID()}.db`);

// Everything here runs as a copy run from source: no launch secret, not the desktop app, no browser-test
// switch, and no model key (so the intent parser never calls out and answers from its keyword matcher).
const ENV_NAMES = [
  "DATABASE_URL",
  LAUNCH_SECRET_ENV,
  "DOTAMI_DESKTOP",
  E2E_RATE_LIMITS_ENV,
  "ANTHROPIC_API_KEY",
  "LAW_STORE_PATH",
] as const;
const savedEnv = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));

let prisma: PrismaClient;
let ideaId: string;

beforeAll(async () => {
  migratedFile(dbFile);
  for (const name of ENV_NAMES) delete process.env[name];
  // The routes build their own client from DATABASE_URL when first imported.
  process.env.DATABASE_URL = fileUrl(dbFile);
  prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  ideaId = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  // The routes' own client also holds the file open; Windows won't delete it until it lets go.
  await (await import("@/lib/prisma")).prisma.$disconnect();
  for (const name of ENV_NAMES) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

afterEach(() => __resetRateLimitStateForTests());

const FROM_WINDOW = { "sec-fetch-site": "same-origin" };

function request(
  url: string,
  body: string,
  headers: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.77", ...headers },
    body,
  });
}

const json = (value: unknown) => JSON.stringify(value);

/** Ids and moments that differ every run, replaced so the rest can be compared exactly. */
function placeholders(value: unknown): unknown {
  if (typeof value === "string") {
    if (value === ideaId) return "<idea id>";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) return "<moment>";
    if (value === localToday()) return "<today>";
    if (/^c[a-z0-9]{24}$/.test(value)) return "<id>";
    return value;
  }
  if (Array.isArray(value)) return value.map(placeholders);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, placeholders(inner)]),
    );
  }
  return value;
}

interface Answer {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

async function answer(response: Response): Promise<Answer> {
  const text = await response.text();
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: placeholders(JSON.parse(text)),
  };
}

/**
 * The answer to the request after `limit` have been counted. The clock is held still so Retry-After is
 * always the full minute; the counted requests carry a body that isn't JSON, so none reaches the data file.
 */
async function pastTheLimit(limit: number, send: () => Promise<Response>): Promise<Answer> {
  const clock = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 9, 31, 12));
  try {
    for (let i = 0; i < limit; i += 1) await send();
    return await answer(await send());
  } finally {
    clock.mockRestore();
  }
}

const TOO_BIG = (bytes: number) => json({ pad: "x".repeat(bytes) });

describe("figures: POST /api/figures/propose", () => {
  it("answers as it did", async () => {
    const { POST } = await import("@/app/api/figures/propose/route");
    const send = (body: string, headers: Record<string, string> = {}) =>
      POST(request("/api/figures/propose", body, headers));
    const source = { kind: "file", label: "sales-2025.xlsx", rows: 12 };
    const good = {
      kind: "gross-revenue",
      periodStart: "2025-01-01",
      periodEnd: "2025-12-31",
      amountCents: 1_000_000,
    };
    const answers = {
      notJson: await answer(await send("{")),
      plainText: await answer(await send(json({}), { "content-type": "text/plain" })),
      crossSite: await answer(await send(json({}), { "sec-fetch-site": "cross-site" })),
      tooBig: await answer(await send(TOO_BIG(300 * 1024))),
      unknownIdea: await answer(
        await send(json({ ventureId: "no-such-idea", source, figures: [good] })),
      ),
      badFigure: await answer(
        await send(json({ ventureId: ideaId, source, figures: [{ ...good, kind: "net-profit" }] })),
      ),
      works: await answer(await send(json({ ventureId: ideaId, source, figures: [good] }))),
    };
    __resetRateLimitStateForTests();
    const limited = await pastTheLimit(30, () => send("{"));
    expect({ ...answers, limited }).toMatchInlineSnapshot(`
      {
        "badFigure": {
          "body": {
            "error": "Figure 1: The kind of figure has to be one of: gross-revenue, business-gross-income, business-total-expenses, business-net-income-before-adjustments, business-net-income, savings-for-start, start-up-cost-line.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "crossSite": {
          "body": {
            "error": "Cross-site requests are not accepted.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 403,
        },
        "limited": {
          "body": {
            "error": "Too many requests — slow down and try again shortly.",
          },
          "headers": {
            "content-type": "application/json",
            "retry-after": "60",
          },
          "status": 429,
        },
        "notJson": {
          "body": {
            "error": "Invalid JSON",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "plainText": {
          "body": {
            "error": "Send the body as application/json.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 415,
        },
        "tooBig": {
          "body": {
            "error": "Request body exceeded the 262144-byte limit.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 413,
        },
        "unknownIdea": {
          "body": {
            "error": "That idea isn't in DotAmi.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 404,
        },
        "works": {
          "body": {
            "figures": [
              {
                "amountCents": 1000000,
                "confirmedAt": null,
                "costLine": null,
                "currency": "CAD",
                "editedByPerson": false,
                "formLine": null,
                "id": "<id>",
                "kind": "gross-revenue",
                "periodEnd": "2025-12-31",
                "periodStart": "2025-01-01",
                "proposedAt": "<moment>",
                "retractedAt": null,
                "sourceKind": "file",
                "sourceLabel": "sales-2025.xlsx",
                "sourceRows": 12,
                "status": "proposed",
                "taxYear": null,
                "ventureId": "<idea id>",
              },
            ],
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 201,
        },
      }
    `);
  });
});

describe("figures: POST /api/figures/bank-sources", () => {
  it("answers as it did", async () => {
    const { POST } = await import("@/app/api/figures/bank-sources/route");
    const send = (body: string, headers: Record<string, string> = {}) =>
      POST(request("/api/figures/bank-sources", body, headers));
    expect({
      notFromWindow: await answer(await send(json({ allow: "once", name: "Chequing" }))),
      settingOff: await answer(await send(json({ allow: "once", name: "Chequing" }), FROM_WINDOW)),
    }).toMatchInlineSnapshot(`
      {
        "notFromWindow": {
          "body": {
            "error": "Bank and card accounts can only be listed, allowed or taken back from DotAmi's own window. An outside agent can't reach them.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 403,
        },
        "settingOff": {
          "body": {
            "error": "Bank and card records is off in Settings, so no account can be added.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 409,
        },
      }
    `);
  });
});

describe("futures: POST /api/futures/<id>/date", () => {
  it("answers as it did", async () => {
    const { POST } = await import("@/app/api/futures/[id]/date/route");
    const send = (body: string, headers: Record<string, string> = FROM_WINDOW, id = ideaId) =>
      POST(request(`/api/futures/${id}/date`, body, headers), { params: Promise.resolve({ id }) });
    const answers = {
      notFromWindow: await answer(await send(json({ month: null }), {})),
      notJson: await answer(await send("{")),
      plainText: await answer(
        await send(json({ month: null }), { ...FROM_WINDOW, "content-type": "text/plain" }),
      ),
      tooBig: await answer(await send(TOO_BIG(8 * 1024))),
      unknownIdea: await answer(await send(json({ month: null }), FROM_WINDOW, "no-such-idea")),
      badMonth: await answer(await send(json({ month: "2001-01" }))),
      works: await answer(await send(json({ month: null }))),
    };
    __resetRateLimitStateForTests();
    const limited = await pastTheLimit(120, () => send("{"));
    expect({ ...answers, limited }).toMatchInlineSnapshot(`
      {
        "badMonth": {
          "body": {
            "error": "That month has already gone.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "limited": {
          "body": {
            "error": "Too many requests — slow down and try again shortly.",
          },
          "headers": {
            "content-type": "application/json",
            "retry-after": "60",
          },
          "status": 429,
        },
        "notFromWindow": {
          "body": {
            "error": "Your progress, your date, your pick of job and your skill marks can only be changed from DotAmi's own window. An outside agent can't change them yet.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 403,
        },
        "notJson": {
          "body": {
            "error": "Invalid JSON",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "plainText": {
          "body": {
            "error": "Send the body as application/json.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 415,
        },
        "tooBig": {
          "body": {
            "error": "Request body exceeded the 4096-byte limit.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 413,
        },
        "unknownIdea": {
          "body": {
            "error": "That idea isn't in DotAmi.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 404,
        },
        "works": {
          "body": {
            "future": {
              "area": null,
              "forkPicks": {
                "gstTiming": {
                  "from": "map",
                  "pickedOn": null,
                  "stepId": "stage-2b-mandatory-gst-registration",
                },
                "incorporationTiming": {
                  "from": "map",
                  "pickedOn": null,
                  "stepId": "stage-3a-incorporation-80k-net",
                },
              },
              "job": null,
              "lookingFor": null,
              "lookingForOn": null,
              "place": "CA-AB",
              "region": null,
              "roadChosen": false,
              "roadChosenOn": null,
              "roadId": "road-starting-any-business-ab",
              "targetMonth": null,
              "targetMonthSetOn": null,
              "ventureId": "<idea id>",
            },
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 200,
        },
      }
    `);
  });
});

describe("expenses: POST /api/expenses/propose and /api/expenses/agree", () => {
  it("answers as it did", async () => {
    const { POST } = await import("@/app/api/expenses/propose/route");
    const agree = (await import("@/app/api/expenses/agree/route")).POST;
    const send = (body: string, headers: Record<string, string> = {}) =>
      POST(request("/api/expenses/propose", body, headers));
    const source = { kind: "typed", label: "typed by you" };
    const good = {
      date: "2026-09-30",
      amountCents: 4_599,
      paidTo: "Example Stationery Ltd",
      whatFor: "printer paper",
    };
    const answers = {
      notJson: await answer(await send("{")),
      plainText: await answer(await send(json({}), { "content-type": "text/plain" })),
      tooBig: await answer(await send(TOO_BIG(800 * 1024))),
      unknownIdea: await answer(
        await send(json({ ventureId: "no-such-idea", source, expenses: [good] })),
      ),
      badRecord: await answer(
        await send(
          json({ ventureId: ideaId, source, expenses: [{ ...good, amountCents: "lots" }] }),
        ),
      ),
      works: await answer(await send(json({ ventureId: ideaId, source, expenses: [good] }))),
      agreeNotFromWindow: await answer(
        await agree(request("/api/expenses/agree", json({ ventureId: ideaId, expenseIds: [] }))),
      ),
    };
    __resetRateLimitStateForTests();
    const limited = await pastTheLimit(30, () => send("{"));
    expect({ ...answers, limited }).toMatchInlineSnapshot(`
      {
        "agreeNotFromWindow": {
          "body": {
            "error": "Only the agree prompt in DotAmi's window can confirm expense records.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 403,
        },
        "badRecord": {
          "body": {
            "error": "Expense 1: The amount has to be a whole number of cents.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "limited": {
          "body": {
            "error": "Too many requests — slow down and try again shortly.",
          },
          "headers": {
            "content-type": "application/json",
            "retry-after": "60",
          },
          "status": 429,
        },
        "notJson": {
          "body": {
            "error": "Invalid JSON",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "plainText": {
          "body": {
            "error": "Send the body as application/json.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 415,
        },
        "tooBig": {
          "body": {
            "error": "Request body exceeded the 786432-byte limit.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 413,
        },
        "unknownIdea": {
          "body": {
            "error": "That idea isn't in DotAmi.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 404,
        },
        "works": {
          "body": {
            "expenses": [
              {
                "agreedAt": null,
                "amountCents": 4599,
                "businessSharePercent": null,
                "category": null,
                "creditNote": null,
                "currency": "CAD",
                "date": "2026-09-30",
                "editedByPerson": false,
                "gstHstCents": null,
                "id": "<id>",
                "paidTo": "Example Stationery Ltd",
                "proposedAt": "<moment>",
                "receipt": null,
                "recordKind": "expense",
                "refundOfId": null,
                "retractedAt": null,
                "sellerAddress": null,
                "sourceKind": "typed",
                "sourceLabel": "typed by you",
                "status": "proposed",
                "vendorGstNumber": null,
                "ventureId": "<idea id>",
                "whatFor": "printer paper",
              },
            ],
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 201,
        },
      }
    `);
  });
});

describe("landscape: POST /api/futures/<id>/watched", () => {
  it("answers as it did", async () => {
    const { POST } = await import("@/app/api/futures/[id]/watched/route");
    const send = (body: string, headers: Record<string, string> = FROM_WINDOW, id = ideaId) =>
      POST(request(`/api/futures/${id}/watched`, body, headers), {
        params: Promise.resolve({ id }),
      });
    const answers = {
      notFromWindow: await answer(await send(json({ nameAsTyped: "Corner Bakery" }), {})),
      notJson: await answer(await send("{")),
      plainText: await answer(
        await send(json({ nameAsTyped: "Corner Bakery" }), {
          ...FROM_WINDOW,
          "content-type": "text/plain",
        }),
      ),
      tooBig: await answer(await send(TOO_BIG(70 * 1024))),
      unknownIdea: await answer(
        await send(json({ nameAsTyped: "Corner Bakery" }), FROM_WINDOW, "no-such-idea"),
      ),
      badLink: await answer(
        await send(json({ nameAsTyped: "Corner Bakery", url: "javascript:alert(1)" })),
      ),
      works: await answer(
        await send(
          json({
            nameAsTyped: "Corner Bakery",
            url: "https://example.com/bakery",
            note: "Opens at 7",
          }),
        ),
      ),
    };
    __resetRateLimitStateForTests();
    const limited = await pastTheLimit(60, () => send("{"));
    expect({ ...answers, limited }).toMatchInlineSnapshot(`
      {
        "badLink": {
          "body": {
            "error": "A link has to start with http:// or https://.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "limited": {
          "body": {
            "error": "Too many requests — slow down and try again shortly.",
          },
          "headers": {
            "content-type": "application/json",
            "retry-after": "60",
          },
          "status": 429,
        },
        "notFromWindow": {
          "body": {
            "error": "Businesses you're watching can only be read and changed from DotAmi's own window. An outside agent can't reach them yet.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 403,
        },
        "notJson": {
          "body": {
            "error": "Invalid JSON",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "plainText": {
          "body": {
            "error": "Send the body as application/json.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 415,
        },
        "tooBig": {
          "body": {
            "error": "Request body exceeded the 65536-byte limit.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 413,
        },
        "unknownIdea": {
          "body": {
            "error": "That idea isn't in DotAmi.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 404,
        },
        "works": {
          "body": {
            "business": {
              "adLinks": [],
              "addedOn": "<today>",
              "id": "<id>",
              "nameAsTyped": "Corner Bakery",
              "note": "Opens at 7",
              "updatedOn": "<today>",
              "url": "https://example.com/bakery",
            },
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 200,
        },
      }
    `);
  });
});

describe("settings (counted its rate limit by hand): PUT /api/settings", () => {
  it("answers as it did", async () => {
    const { PUT, GET } = await import("@/app/api/settings/route");
    const send = (body: string, headers: Record<string, string> = FROM_WINDOW) =>
      PUT(request("/api/settings", body, headers, "PUT"));
    const answers = {
      notFromWindow: await answer(
        await send(json({ id: "figure-reminders", value: { cadences: ["yearly"] } }), {}),
      ),
      notJson: await answer(await send("{")),
      plainText: await answer(
        await send(json({}), { ...FROM_WINDOW, "content-type": "text/plain" }),
      ),
      tooBig: await answer(await send(TOO_BIG(70 * 1024))),
      unknownSetting: await answer(await send(json({ id: "no-such-setting", value: {} }))),
      badValue: await answer(
        await send(json({ id: "figure-reminders", value: { cadences: ["weekly"] } })),
      ),
      works: await answer(
        await send(json({ id: "figure-reminders", value: { cadences: ["quarterly", "monthly"] } })),
      ),
      readNotFromWindow: await answer(
        await GET(new Request("http://localhost/api/settings?id=figure-reminders")),
      ),
      read: await answer(
        await GET(
          new Request("http://localhost/api/settings?id=figure-reminders", {
            headers: FROM_WINDOW,
          }),
        ),
      ),
    };
    __resetRateLimitStateForTests();
    const limited = await pastTheLimit(120, () => send("{"));
    expect({ ...answers, limited }).toMatchInlineSnapshot(`
      {
        "badValue": {
          "body": {
            "error": "That value isn't one this setting accepts.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "limited": {
          "body": {
            "error": "Too many requests — slow down and try again shortly.",
          },
          "headers": {
            "content-type": "application/json",
            "retry-after": "60",
          },
          "status": 429,
        },
        "notFromWindow": {
          "body": {
            "error": "Settings can only be changed from DotAmi's own window. An outside agent can't read or change them yet.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 403,
        },
        "notJson": {
          "body": {
            "error": "Invalid JSON",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "plainText": {
          "body": {
            "error": "Send the body as application/json.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 415,
        },
        "read": {
          "body": {
            "id": "figure-reminders",
            "value": {
              "cadences": [
                "monthly",
                "quarterly",
              ],
              "dismissed": [],
              "ideaIds": [],
            },
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 200,
        },
        "readNotFromWindow": {
          "body": {
            "error": "Settings can only be changed from DotAmi's own window. An outside agent can't read or change them yet.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 403,
        },
        "tooBig": {
          "body": {
            "error": "Request body exceeded the 65536-byte limit.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 413,
        },
        "unknownSetting": {
          "body": {
            "error": "That isn't a setting DotAmi can save.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "works": {
          "body": {
            "id": "figure-reminders",
            "value": {
              "cadences": [
                "monthly",
                "quarterly",
              ],
              "dismissed": [],
              "ideaIds": [],
            },
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 200,
        },
      }
    `);
  });
});

describe("the intent parser (counted its rate limit by hand): POST /api/intent/parse", () => {
  it("answers as it did", async () => {
    const { POST } = await import("@/app/api/intent/parse/route");
    const send = (body: string, headers: Record<string, string> = {}) =>
      POST(request("/api/intent/parse", body, headers));
    const answers = {
      notJson: await answer(await send("{")),
      // A JSON null used to fail inside the same try as the parse, so it gets the parse's words too.
      jsonNull: await answer(await send("null")),
      plainText: await answer(
        await send(json({ text: "a bakery" }), { "content-type": "text/plain" }),
      ),
      tooBig: await answer(await send(TOO_BIG(9 * 1024))),
      empty: await answer(await send(json({ text: "   " }))),
      works: await answer(
        await send(json({ text: "I want to open a bakery in Calgary and buy an oven" })),
      ),
    };
    __resetRateLimitStateForTests();
    const limited = await pastTheLimit(30, () => send("{"));
    expect({ ...answers, limited }).toMatchInlineSnapshot(`
      {
        "empty": {
          "body": {
            "error": "text required",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "jsonNull": {
          "body": {
            "error": "Invalid JSON payload",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "limited": {
          "body": {
            "error": "Too many requests — slow down and try again shortly.",
          },
          "headers": {
            "content-type": "application/json",
            "retry-after": "60",
          },
          "status": 429,
        },
        "notJson": {
          "body": {
            "error": "Invalid JSON payload",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 400,
        },
        "plainText": {
          "body": {
            "error": "Send the body as application/json.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 415,
        },
        "tooBig": {
          "body": {
            "error": "Request body exceeded the 8192-byte limit.",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 413,
        },
        "works": {
          "body": {
            "activityTags": [],
            "capitalPurchasePlanned": false,
            "goals": [],
            "province": "AB",
            "rawLabel": "I want to open a bakery in Calgary and buy an oven",
            "source": "fallback",
            "unmapped": [
              "I want to open a bakery in Calgary and buy an oven",
            ],
            "ventureType": "service",
          },
          "headers": {
            "content-type": "application/json",
          },
          "status": 200,
        },
      }
    `);
  });
});

describe("the other seven routes that counted their rate limit by hand", () => {
  it("answer as they did", async () => {
    const lawProvision = (await import("@/app/api/law/provision/route")).GET;
    const personFiguresAgree = (await import("@/app/api/person-figures/agree/route")).POST;
    const statements = (await import("@/app/api/person/statements/route")).POST;
    const playbook = (await import("@/app/api/playbook/route")).POST;
    const scenarioSave = (await import("@/app/api/scenario/save/route")).POST;
    const links = (await import("@/app/api/ventures/[id]/links/route")).POST;
    const patch = (await import("@/app/api/ventures/[id]/route")).PATCH;
    const params = (id: string) => ({ params: Promise.resolve({ id }) });
    const otherIdea = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;

    const law = (query: string) =>
      lawProvision(
        new Request(`http://localhost/api/law/provision?${query}`, {
          headers: { "x-forwarded-for": "203.0.113.77" },
        }),
      );
    const agree = (body: string, headers: Record<string, string> = FROM_WINDOW) =>
      personFiguresAgree(request("/api/person-figures/agree", body, headers));
    const say = (body: string) => statements(request("/api/person/statements", body));
    const play = (body: string) => playbook(request("/api/playbook", body));
    const save = (body: string) => scenarioSave(request("/api/scenario/save", body));
    const link = (body: string) =>
      links(request(`/api/ventures/${ideaId}/links`, body), params(ideaId));
    const edit = (body: string) =>
      patch(request(`/api/ventures/${ideaId}`, body, {}, "PATCH"), params(ideaId));

    /** What a route answers past its limit, with the counts cleared before and after. */
    const limited = async (limit: number, send: () => Promise<Response>) => {
      __resetRateLimitStateForTests();
      const result = await pastTheLimit(limit, send);
      __resetRateLimitStateForTests();
      return result;
    };
    /** Status, headers and the body's top-level keys, for an answer too long to pin whole. */
    const shape = async (response: Response) => {
      const { status, headers, body } = await answer(response);
      return { status, headers, keys: Object.keys(body as object).sort() };
    };

    const answers = {
      lawProvision: {
        badLabel: await answer(await law("source=ita&label=--help")),
        noStore: await answer(await law("source=ita&label=20&sub=(1)(a)")),
        limited: await limited(60, () => law("source=ita&label=--x")),
      },
      personFiguresAgree: {
        notFromWindow: await answer(await agree(json({ ids: [] }), {})),
        notJson: await answer(await agree("{")),
        badEdits: await answer(await agree(json({ ids: [], edits: [] }))),
        // Through to the store, which refuses an empty list in its own words (futureFailure's 400).
        noIds: await answer(await agree(json({ ids: [] }))),
        limited: await limited(60, () => agree("{")),
      },
      statements: {
        notJson: await answer(await say("{")),
        plainText: await answer(
          await statements(
            request("/api/person/statements", json({ text: "hi" }), {
              "content-type": "text/plain",
            }),
          ),
        ),
        empty: await answer(await say(json({ text: " " }))),
        works: await answer(
          await say(json({ text: "I want a bakery of my own.", saidAt: "2026-10-01" })),
        ),
        limited: await limited(60, () => say("{")),
      },
      playbook: {
        notJson: await answer(await play("{")),
        noScenario: await answer(await play(json({}))),
        unknownRoad: await answer(
          await play(json({ scenario: demoScenarios[0], roadId: "no-such-road" })),
        ),
        works: await shape(await play(json({ scenario: demoScenarios[0] }))),
        limited: await limited(10, () => play("{")),
      },
      scenarioSave: {
        notJson: await answer(await save("{")),
        notAScenario: await answer(await save(json({ scenario: {} }))),
        works: await shape(await save(json({ scenario: demoScenarios[1] }))),
        limited: await limited(120, () => save("{")),
      },
      ventureLinks: {
        notJson: await answer(await link("{")),
        toItself: await answer(await link(json({ toId: ideaId, kind: "related" }))),
        works: await answer(
          await link(json({ toId: otherIdea, kind: "related", note: "same street" })),
        ),
        limited: await limited(60, () => link("{")),
      },
      venturePatch: {
        notJson: await answer(await edit("{")),
        nothing: await answer(await edit(json({}))),
        works: await answer(await edit(json({ notes: "Ask about the lease." }))),
        limited: await limited(120, () => edit("{")),
      },
    };
    // A JSON null as the playbook's body still throws past the route, as it did (Next then answers 500);
    // pinned so this change can't quietly alter it either way.
    await expect(play("null")).rejects.toThrow(TypeError);
    expect(answers).toMatchInlineSnapshot(`
      {
        "lawProvision": {
          "badLabel": {
            "body": {
              "error": "label is required (letters, digits, dots, spaces)",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "limited": {
            "body": {
              "error": "Too many requests — slow down and try again shortly.",
            },
            "headers": {
              "content-type": "application/json",
              "retry-after": "60",
            },
            "status": 429,
          },
          "noStore": {
            "body": {
              "found": false,
              "reason": "Law store not reachable from this machine (LAW_STORE_PATH unset or lookup.py missing). The citation link still works.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 503,
          },
        },
        "personFiguresAgree": {
          "badEdits": {
            "body": {
              "error": "Edits have to be an object keyed by the number's id.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "limited": {
            "body": {
              "error": "Too many requests — slow down and try again shortly.",
            },
            "headers": {
              "content-type": "application/json",
              "retry-after": "60",
            },
            "status": 429,
          },
          "noIds": {
            "body": {
              "error": "Say which numbers you mean.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "notFromWindow": {
            "body": {
              "error": "Only the agree prompt in DotAmi's window can agree to a number about you.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 403,
          },
          "notJson": {
            "body": {
              "error": "Invalid JSON",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
        },
        "playbook": {
          "limited": {
            "body": {
              "error": "Too many requests — slow down and try again shortly.",
            },
            "headers": {
              "content-type": "application/json",
              "retry-after": "60",
            },
            "status": 429,
          },
          "noScenario": {
            "body": {
              "error": "scenario payload required",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "notJson": {
            "body": {
              "error": "Invalid JSON payload",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "unknownRoad": {
            "body": {
              "error": "unknown road",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "works": {
            "headers": {
              "cache-control": "no-store",
              "content-type": "application/json",
            },
            "keys": [
              "skeleton",
            ],
            "status": 200,
          },
        },
        "scenarioSave": {
          "limited": {
            "body": {
              "error": "Too many requests — slow down and try again shortly.",
            },
            "headers": {
              "content-type": "application/json",
              "retry-after": "60",
            },
            "status": 429,
          },
          "notAScenario": {
            "body": {
              "error": "Invalid scenario payload",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "notJson": {
            "body": {
              "error": "Invalid JSON",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "works": {
            "headers": {
              "content-type": "application/json",
            },
            "keys": [
              "ok",
              "scenario",
              "ventureId",
            ],
            "status": 200,
          },
        },
        "statements": {
          "empty": {
            "body": {
              "error": "Say something first — the statement is empty.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "limited": {
            "body": {
              "error": "Too many requests — slow down and try again shortly.",
            },
            "headers": {
              "content-type": "application/json",
              "retry-after": "60",
            },
            "status": 429,
          },
          "notJson": {
            "body": {
              "error": "Invalid JSON",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "plainText": {
            "body": {
              "error": "Send the body as application/json.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 415,
          },
          "works": {
            "body": {
              "ok": true,
              "statement": {
                "id": "<id>",
                "recordedAt": "<moment>",
                "saidAt": "2026-10-01",
                "source": "typed",
                "sourceRef": "app",
                "text": "I want a bakery of my own.",
              },
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 200,
          },
        },
        "ventureLinks": {
          "limited": {
            "body": {
              "error": "Too many requests — slow down and try again shortly.",
            },
            "headers": {
              "content-type": "application/json",
              "retry-after": "60",
            },
            "status": 429,
          },
          "notJson": {
            "body": {
              "error": "Invalid JSON",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "toItself": {
            "body": {
              "error": "an idea cannot link to itself",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "works": {
            "body": {
              "id": "<id>",
              "ok": true,
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 200,
          },
        },
        "venturePatch": {
          "limited": {
            "body": {
              "error": "Too many requests — slow down and try again shortly.",
            },
            "headers": {
              "content-type": "application/json",
              "retry-after": "60",
            },
            "status": 429,
          },
          "notJson": {
            "body": {
              "error": "Invalid JSON",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "nothing": {
            "body": {
              "error": "nothing to update",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 400,
          },
          "works": {
            "body": {
              "id": "<idea id>",
              "ok": true,
              "updatedAt": "<moment>",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 200,
          },
        },
      }
    `);
  });
});

describe("each domain's error mapper, given an error none of its classes match", () => {
  afterEach(() => vi.restoreAllMocks());

  it("answers 503 and logs one line with the error's name and code, nothing from its message", async () => {
    const figures = await import("@/lib/figures/http");
    const futures = await import("@/lib/futures/http");
    const expenses = await import("@/lib/expenses/http");
    const landscape = await import("@/lib/landscape/http");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const unexpected = () => Object.assign(new Error("amountCents: 424242424"), { code: "P1001" });

    const answers = {
      figuresStore: await answer(figures.storeErrorResponse("propose", unexpected())),
      figuresBankSources: await answer(
        figures.bankSourcesFailure("figures/bank-sources POST", unexpected()),
      ),
      futures: await answer(futures.futureFailure("futures/date POST", unexpected())),
      expensesStore: await answer(expenses.storeErrorResponse("propose", unexpected())),
      landscape: await answer(landscape.watchedFailure("futures/watched POST", unexpected())),
    };
    expect({ answers, logged: log.mock.calls }).toMatchInlineSnapshot(`
      {
        "answers": {
          "expensesStore": {
            "body": {
              "error": "No database reachable — nothing was changed.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 503,
          },
          "figuresBankSources": {
            "body": {
              "error": "No database reachable — nothing was changed.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 503,
          },
          "figuresStore": {
            "body": {
              "error": "No database reachable — nothing was changed.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 503,
          },
          "futures": {
            "body": {
              "error": "No database reachable — nothing was changed.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 503,
          },
          "landscape": {
            "body": {
              "error": "No database reachable — nothing was changed.",
            },
            "headers": {
              "content-type": "application/json",
            },
            "status": 503,
          },
        },
        "logged": [
          [
            "[figures/propose] failed (Error, P1001)",
          ],
          [
            "[figures/bank-sources POST] failed (Error, P1001)",
          ],
          [
            "[futures/date POST] failed (Error, P1001)",
          ],
          [
            "[expenses/propose] failed (Error, P1001)",
          ],
          [
            "[futures/watched POST] failed (Error, P1001)",
          ],
        ],
      }
    `);
  });
});
