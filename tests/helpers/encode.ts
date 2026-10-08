/**
 * Turns text into the bytes a file on disk would hold, so a practice file can be written the way a
 * real program writes it (plain UTF-8, UTF-8 with a byte-order mark, or Windows-1252) and then
 * read back through lib/figures/file/decode.ts.
 *
 * No library: every letter these test files use sits at the same number in Windows-1252 as its
 * Unicode number (é = 0xE9, ç = 0xE7), so the encoder only has to refuse anything outside that
 * range. A character it can't write throws, so a French file can never be silently mis-encoded.
 */

/** Plain UTF-8, no byte-order mark. */
export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** UTF-8 with the three-byte mark (EF BB BF) some programs put in front. */
export function utf8Bom(text: string): Uint8Array {
  const body = utf8(text);
  const out = new Uint8Array(3 + body.length);
  out.set([0xef, 0xbb, 0xbf], 0);
  out.set(body, 3);
  return out;
}

/**
 * Windows-1252 bytes, one per character. Allowed: space to ~ (U+0020-U+007E), the Latin-1 letters
 * and signs (U+00A0-U+00FF) and the line breaks. Anything else throws: the euro sign, curly quotes
 * and the like live in a different part of Windows-1252, and no practice file needs them.
 */
export function windows1252(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const allowed =
      code === 0x0a ||
      code === 0x0d ||
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0xff);
    if (!allowed) {
      // Names the position and the code, never the text around it.
      throw new Error(
        `Character U+${code.toString(16).toUpperCase().padStart(4, "0")} at ${i} has no safe Windows-1252 byte.`,
      );
    }
    out[i] = code;
  }
  return out;
}
