/**
 * Reads and parses a JSON request body for the write routes, refusing three things before a
 * byte is parsed:
 *
 * 1. A body larger than `maxBytes` — enforced on the actual stream, not just a client-supplied
 *    `content-length` header, which is easy to omit or lie about (audit-2026-07-04 H6).
 * 2. A body that is not declared `application/json`. Every caller in this app sends that
 *    header. A `text/plain` POST is what a hostile web page can fire at localhost without a
 *    CORS preflight; refusing it closes that door (security review 2026-09-20).
 * 3. A browser request from another site. Browsers stamp `Sec-Fetch-Site` on every request;
 *    the app's own pages are `same-origin`. Non-browser clients (curl, tests) send no header
 *    and are not affected — this app has no authentication by design, so this is a guard
 *    against drive-by writes from a web page, not an access control.
 */
export class RequestRejectedError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RequestRejectedError";
  }
}

export class PayloadTooLargeError extends RequestRejectedError {
  constructor(maxBytes: number) {
    super(`Request body exceeded the ${maxBytes}-byte limit.`, 413);
    this.name = "PayloadTooLargeError";
  }
}

export class UnsupportedMediaTypeError extends RequestRejectedError {
  constructor() {
    super("Send the body as application/json.", 415);
    this.name = "UnsupportedMediaTypeError";
  }
}

export class CrossSiteRequestError extends RequestRejectedError {
  constructor() {
    super("Cross-site requests are not accepted.", 403);
    this.name = "CrossSiteRequestError";
  }
}

function assertAcceptableOrigin(request: Request): void {
  const site = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (site === "cross-site") throw new CrossSiteRequestError();
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type !== "application/json") throw new UnsupportedMediaTypeError();
}

export async function readJsonWithLimit<T>(request: Request, maxBytes: number): Promise<T> {
  assertAcceptableOrigin(request);

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

/** One response shape for every refusal above: the status the error carries, a plain message. */
export function rejectedResponse(error: RequestRejectedError): Response {
  return Response.json({ error: error.message }, { status: error.status });
}

/** Kept for callers that only handle the size case. */
export function payloadTooLargeResponse(error: PayloadTooLargeError): Response {
  return rejectedResponse(error);
}
