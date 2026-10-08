import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "@/lib/figures/file/fingerprint";
import { MAX_FILE_BYTES } from "@/lib/figures/file/types";

// [8c-2] The fingerprint of a dropped file. Runs on Node 22+, where globalThis.crypto.subtle exists
// just as it does in the app's window. All inputs are invented; no real file is read.

const text = (s: string) => new TextEncoder().encode(s);

describe("sha256Hex", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gives the published SHA-256 test values", async () => {
    // FIPS 180-2 appendix B: "abc" and the 448-bit two-block message. The empty input is the
    // well-known hash of nothing. These come from the standard, not from this code.
    expect(await sha256Hex(text("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(await sha256Hex(text("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
    expect(await sha256Hex(new Uint8Array())).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("is 64 lowercase hex characters, and matches node:crypto on arbitrary bytes", async () => {
    // An independent second implementation as the oracle, over every byte value.
    const all = new Uint8Array(256).map((_, i) => i);
    const fingerprint = await sha256Hex(all);
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint).toBe(createHash("sha256").update(all).digest("hex"));
  });

  it("gives the same answer for the same bytes and a different one when a single byte differs", async () => {
    const a = await sha256Hex(text("date,amount\n2026-01-05,10\n"));
    const again = await sha256Hex(text("date,amount\n2026-01-05,10\n"));
    const oneOff = await sha256Hex(text("date,amount\n2026-01-05,11\n"));
    expect(a).toBe(again);
    expect(oneOff).not.toBe(a);
  });

  it("hashes only the bytes in a view, not the buffer behind it", async () => {
    // A file read into the middle of a bigger buffer must not drag its neighbours into the hash.
    const wide = new Uint8Array([9, 9, 97, 98, 99, 9]);
    expect(await sha256Hex(wide.subarray(2, 5))).toBe(await sha256Hex(text("abc")));
  });

  it("hashes a file at the 10 MB limit", async () => {
    const big = new Uint8Array(MAX_FILE_BYTES).fill(7);
    expect(await sha256Hex(big)).toBe(createHash("sha256").update(big).digest("hex"));
  });

  it("returns null, without throwing, where crypto.subtle is missing", async () => {
    // A plain-http network address: `crypto` is there but `subtle` is withheld.
    vi.stubGlobal("crypto", {});
    await expect(sha256Hex(text("abc"))).resolves.toBeNull();
    // And an environment with no crypto object at all.
    vi.stubGlobal("crypto", undefined);
    await expect(sha256Hex(text("abc"))).resolves.toBeNull();
  });

  it("returns null, without throwing, when the digest itself fails", async () => {
    vi.stubGlobal("crypto", {
      subtle: {
        digest: () => Promise.reject(new Error("secret-cell-value")),
      },
    });
    await expect(sha256Hex(text("abc"))).resolves.toBeNull();
  });

  it("logs nothing, even when the digest fails", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    try {
      vi.stubGlobal("crypto", { subtle: { digest: () => Promise.reject(new Error("boom")) } });
      await sha256Hex(text("abc"));
      vi.unstubAllGlobals();
      await sha256Hex(text("abc"));
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  it("its source never logs, in line with the figures privacy review", () => {
    // Privacy review rule 2: nothing from a file reaches a log. A source scan, since a console call
    // that never runs in the happy path would slip past the test above.
    const source = readFileSync(
      path.join(process.cwd(), "lib", "figures", "file", "fingerprint.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/console\./);
  });
});
