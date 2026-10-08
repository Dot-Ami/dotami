/**
 * [8c-2] A fingerprint of a dropped file: the SHA-256 of its bytes, as 64 lowercase hex characters.
 *
 * It is worked out inside the app's own window, from the bytes already in memory, before they are
 * let go. Nothing here stores the bytes, sends them anywhere or logs anything. The fingerprint
 * says nothing about what is in the file; it only lets DotAmi notice when the very same file is
 * dropped a second time. It will not notice a re-export of the same data (an .xlsx records a
 * modified time inside, so two exports differ) — the totals check in totals.ts covers that case.
 */

const HEX = "0123456789abcdef";

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += HEX[byte >> 4] + HEX[byte & 15];
  return hex;
}

/**
 * The file's SHA-256 as lowercase hex, or null when it can't be worked out. Never throws.
 *
 * It is null when `crypto.subtle` is missing. The browser only offers that on a secure page:
 * http://127.0.0.1 and http://localhost count (so the desktop app and `npm run dev` have it), but a
 * network address over plain http, such as a LAN address listed in DOTAMI_ALLOWED_HOSTS, does not.
 * There we would rather say "can't recognise a file seen before here" than pull in a hashing
 * library for one edge case — the caller shows that line and the totals check still runs.
 * A digest that fails for any other reason also gives null: the fingerprint is a convenience, and
 * a refused digest must never stop a file from being read.
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
  // `crypto` itself exists on an insecure page; only `subtle` is withheld there.
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    // digest() hashes exactly the view it is given, so a file held in a bigger buffer is fine. The
    // cast is for the compiler only (its types refuse a view over a shared buffer); the browser
    // would reject such a view itself, and that lands in the catch below.
    const digest = await subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
    return toHex(new Uint8Array(digest));
  } catch {
    // Deliberately empty: whatever went wrong, the message could echo what was being hashed.
    return null;
  }
}
