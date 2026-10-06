/**
 * [8c] Drop a file — bytes of a CSV → text.
 *
 * A CSV can be saved several ways. Excel on Windows writes French exports as windows-1252 ("Montant
 * reçu" has ç = 0xE7, which is not valid UTF-8), "Save as Unicode text" gives UTF-16, and most other
 * tools write UTF-8, often with a byte-order mark. Runs in the browser; the bytes are not kept.
 */

/** Strip a leading byte-order mark character if one survived decoding. */
function withoutBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function decodeText(bytes: Uint8Array): string {
  // UTF-8 with a byte-order mark (EF BB BF).
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return withoutBom(new TextDecoder("utf-8").decode(bytes.subarray(3)));
  }

  // UTF-16, little-endian (FF FE) or big-endian (FE FF). Skip the mark itself.
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return withoutBom(new TextDecoder("utf-16le").decode(bytes.subarray(2)));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return withoutBom(new TextDecoder("utf-16be").decode(bytes.subarray(2)));
  }

  // No mark: UTF-8 if it is valid UTF-8, otherwise windows-1252. `fatal` makes the first decoder
  // throw instead of quietly replacing bad bytes with U+FFFD, which would corrupt accented words.
  try {
    return withoutBom(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return withoutBom(new TextDecoder("windows-1252").decode(bytes));
  }
}
