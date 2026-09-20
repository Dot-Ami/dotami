import { describe, expect, it } from "vitest";

import { PayloadTooLargeError, readJsonWithLimit } from "@/lib/api/body-limit";

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  const text = JSON.stringify(body);
  return new Request("https://example.com", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: text,
  });
}

describe("readJsonWithLimit", () => {
  it("parses a small payload under the limit", async () => {
    const request = jsonRequest({ text: "hello" });
    const parsed = await readJsonWithLimit<{ text: string }>(request, 1024);
    expect(parsed.text).toBe("hello");
  });

  it("rejects when the declared content-length exceeds the limit", async () => {
    const request = jsonRequest({ text: "x" }, { "content-length": String(10 * 1024) });
    await expect(readJsonWithLimit(request, 1024)).rejects.toThrow(PayloadTooLargeError);
  });

  it("rejects when the actual body exceeds the limit, regardless of headers", async () => {
    const bigText = "a".repeat(5000);
    const request = jsonRequest({ text: bigText });
    await expect(readJsonWithLimit(request, 1024)).rejects.toThrow(PayloadTooLargeError);
  });
});
