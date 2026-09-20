/**
 * Reads and parses a JSON request body while enforcing a real byte cap — not just
 * trusting a client-supplied `content-length` header, which is easy to omit or lie
 * about. Fixes audit-2026-07-04 H6 (no body-size caps on the LLM routes; `history` and
 * `clickedNode` in particular are fully client-controlled and get serialized into the
 * system prompt un-truncated before any per-field slicing happens downstream).
 */
export class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request body exceeded the ${maxBytes}-byte limit.`);
    this.name = "PayloadTooLargeError";
  }
}

export async function readJsonWithLimit<T>(request: Request, maxBytes: number): Promise<T> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  const reader = request.body?.getReader();
  if (!reader) {
    // No readable stream (some test/runtime environments) — content-length check above
    // is the only guard available; fall back to the plain parse.
    return (await request.json()) as T;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new PayloadTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  const text = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf-8");
  return JSON.parse(text) as T;
}

export function payloadTooLargeResponse(error: PayloadTooLargeError): Response {
  return Response.json({ error: error.message }, { status: 413 });
}
