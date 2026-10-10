/**
 * [8i] "Start a new key" (docs/architecture/expense-records.md § 10): the route the button calls, and
 * what the pages say afterwards.
 *
 *   - Only DotAmi's own page can call it (like agreeing and deleting); the body goes through the shared
 *     guard (readJsonWithLimit) and must say { giveUp: true }.
 *   - It does something only while this server's key can't be opened (the lock "key-unreadable"):
 *     never with the key open, from source, with no key store, or a second time.
 *   - What it does: the locked receipt files and the key file are moved aside (desktop/receipt-key.mjs
 *     setAsideLockedReceipts, tested in tests/receipt-key.spec.ts), and the lock becomes
 *     "new-key-at-restart", so the pages say where they went and that the new key comes at the next start.
 *
 * The data folder is a temporary one; the server reads it from DATABASE_URL, as in the app. Nothing here
 * needs the database itself.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { __resetReceiptLockForTests, receiptLock, receiptLockState, receiptsSetAsideTo } from "@/lib/expenses/receipts/lock";
import { receiptProtectionText } from "@/lib/expenses/receipts/protection";
import { addReceipt, ReceiptError } from "@/lib/expenses/receipts/store";
import { png } from "./helpers/receipt-files";

type RouteModule = { POST: (request: Request) => Promise<Response> };
let route: RouteModule;

let dir = "";
const saved = { url: process.env.DATABASE_URL, lock: process.env.DOTAMI_RECEIPT_LOCK, key: process.env.DOTAMI_RECEIPT_KEY };
const LOCKED = `${"ab".repeat(16)}.png`;
const PLAIN = `${"cd".repeat(16)}.png`;
const lockedBytes = Buffer.concat([Buffer.from("DOTAMI-RECEIPT\x01", "latin1"), Buffer.from("0011223344556677", "hex"), Buffer.alloc(40, 3)]);
const keyFileBytes = JSON.stringify({ format: 1, keyId: "0011223344556677", wrapped: Buffer.from("not this account's").toString("base64") });

beforeAll(async () => {
  route = await import("@/app/api/expenses/receipt/new-key/route");
});

/** Starts this "server" with the lock the desktop app would give it, over a data folder with one locked receipt. */
function serverWith(env: Record<string, string>) {
  delete process.env.DOTAMI_RECEIPT_LOCK;
  delete process.env.DOTAMI_RECEIPT_KEY;
  Object.assign(process.env, env);
  __resetReceiptLockForTests();
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "dotami-new-key-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "dotami.db").replace(/\\/g, "/")}`;
  mkdirSync(path.join(dir, "receipts"));
  writeFileSync(path.join(dir, "receipts", LOCKED), lockedBytes);
  writeFileSync(path.join(dir, "receipts", PLAIN), png(2, 2));
  writeFileSync(path.join(dir, "receipts.key"), keyFileBytes);
  serverWith({ DOTAMI_RECEIPT_LOCK: "key-unreadable" });
});

afterEach(() => {
  __resetRateLimitStateForTests();
  __resetReceiptLockForTests();
  for (const [name, value] of [
    ["DATABASE_URL", saved.url],
    ["DOTAMI_RECEIPT_LOCK", saved.lock],
    ["DOTAMI_RECEIPT_KEY", saved.key],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const FROM_APP = { "sec-fetch-site": "same-origin" };
const post = (body: unknown, headers: Record<string, string> = FROM_APP, raw?: string) =>
  new Request("http://localhost/api/expenses/receipt/new-key", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  });

/** Every file under the data folder, with its bytes: "nothing moved" means this is unchanged. */
function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = readFileSync(full).toString("base64");
    }
  };
  walk(dir);
  return out;
}

const errorOf = async (res: Response) => ((await res.json()) as { error?: string }).error ?? "";

describe("who can start a new key", () => {
  it("only DotAmi's own page: an agent, a script or another site gets 403, and nothing is moved", async () => {
    const before = snapshot();
    for (const headers of [{}, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }, { "sec-fetch-site": "none" }] as Record<string, string>[]) {
      const res = await route.POST(post({ giveUp: true }, headers));
      expect(res.status).toBe(403);
      expect(await errorOf(res)).toBe("Only DotAmi's own window can start a new key for your receipts. An agent or another program can't, and nothing was moved.");
    }
    expect(snapshot()).toEqual(before);
    expect(receiptLockState()).toBe("key-unreadable");
  });

  it("reads its body through the shared guard, and moves nothing without { giveUp: true }", async () => {
    const before = snapshot();
    const text = new Request("http://localhost/api/expenses/receipt/new-key", {
      method: "POST",
      headers: { "content-type": "text/plain", ...FROM_APP },
      body: JSON.stringify({ giveUp: true }),
    });
    expect((await route.POST(text)).status).toBe(415);
    expect((await route.POST(post(null, FROM_APP, JSON.stringify({ giveUp: true, pad: "x".repeat(2048) })))).status).toBe(413);
    expect((await route.POST(post(null, FROM_APP, "{"))).status).toBe(400);
    // Seven requests here; the route's own limit is five a minute (a test about the limit would name it).
    __resetRateLimitStateForTests();
    for (const body of [{}, { giveUp: "yes" }, { giveUp: 1 }, [true]]) {
      const res = await route.POST(post(body));
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe("Say that you give up the locked receipts ({ giveUp: true }). Nothing was moved.");
    }
    expect(snapshot()).toEqual(before);
  });
});

describe("when it does something", () => {
  it.each([
    ["the key opens fine", { DOTAMI_RECEIPT_LOCK: "on", DOTAMI_RECEIPT_KEY: Buffer.alloc(32, 7).toString("base64") }, "The key to your receipts opens fine, so there's no new key to start. Nothing was moved."],
    ["a copy run from source", {}, "This copy doesn't encrypt receipts, so there's no key to start again. Nothing was moved."],
    ["no key store, nothing encrypted", { DOTAMI_RECEIPT_LOCK: "no-key-store" }, "This copy doesn't encrypt receipts, so there's no key to start again. Nothing was moved."],
    [
      "the key store only unavailable for now",
      { DOTAMI_RECEIPT_LOCK: "key-out-of-reach" },
      "DotAmi can't reach the key to your receipts right now, so there's no new key to start: the key may still open the next time DotAmi starts. Nothing was moved.",
    ],
  ])("never while %s: 409, and nothing is moved", async (_name, env, message) => {
    serverWith(env);
    const before = snapshot();
    const res = await route.POST(post({ giveUp: true }));
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe(message);
    expect(snapshot()).toEqual(before);
  });

  it("while the key can't be opened: the locked receipt and the key file are moved aside, and the answer says where", async () => {
    const res = await route.POST(post({ giveUp: true }));
    expect(res.status).toBe(200);
    const answer = (await res.json()) as { movedTo: string; receipts: number; keyFile: boolean };
    expect(answer.receipts).toBe(1);
    expect(answer.keyFile).toBe(true);
    expect(path.dirname(answer.movedTo)).toBe(path.join(dir, "backups"));
    expect(path.basename(answer.movedTo)).toMatch(/^receipts-locked-\d+$/);
    expect(readdirSync(answer.movedTo).sort()).toEqual([LOCKED, "receipts.key"]);
    expect(readFileSync(path.join(answer.movedTo, LOCKED)).equals(lockedBytes)).toBe(true);
    expect(readFileSync(path.join(answer.movedTo, "receipts.key"), "utf8")).toBe(keyFileBytes);
    // The plain receipt opens without a key: it stays, and the next start encrypts it with the new key.
    expect(readdirSync(path.join(dir, "receipts"))).toEqual([PLAIN]);
    expect(existsSync(path.join(dir, "receipts.key"))).toBe(false);

    // Until the restart, this server says so on every page, with the folder.
    expect(receiptLockState()).toBe("new-key-at-restart");
    expect(receiptsSetAsideTo()).toBe(answer.movedTo);
    const text = receiptProtectionText("new-key-at-restart", answer.movedTo);
    expect(text.tone).toBe("problem");
    expect(text.headline).toBe("DotAmi starts a new key for your receipts the next time it starts.");
    expect(text.detail).toContain(answer.movedTo);
    expect(text.detail).toContain("Close DotAmi and open it again");
    expect(text.detail).toContain("moved, not deleted");
  });

  it("only once: a second press is refused and moves nothing more", async () => {
    expect((await route.POST(post({ giveUp: true }))).status).toBe(200);
    const after = snapshot();
    const again = await route.POST(post({ giveUp: true }));
    expect(again.status).toBe(409);
    expect(await errorOf(again)).toBe("DotAmi already moved the locked receipts aside. Close it and open it again to start the new key.");
    expect(snapshot()).toEqual(after);
  });

  it("until the restart, no receipt can be added (there is no key to encrypt it with)", async () => {
    expect((await route.POST(post({ giveUp: true }))).status).toBe(200);
    const lock = receiptLock();
    expect(lock.state).toBe("new-key-at-restart");
    await expect(addReceipt({} as never, path.join(dir, "receipts"), "any", new Uint8Array(png(2, 2)), lock)).rejects.toBeInstanceOf(ReceiptError);
    expect(readdirSync(path.join(dir, "receipts"))).toEqual([PLAIN]);
  });
});
