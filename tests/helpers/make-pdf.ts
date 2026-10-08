/**
 * Builds small, valid PDF files in memory for tests (unit and browser), so no binary fixture lives
 * in the repo and every test says exactly what is printed where. Every PDF made here is INVENTED:
 * never a real return, never a real figure.
 *
 * What it writes: one page object per page, US Letter (612 x 792 points, the size of the CRA's own
 * forms), text in the standard Helvetica font placed at exact x/y positions (PDF points from the
 * bottom-left corner, the same numbers pdf.js reports back), and optionally:
 *  - a page that is only a picture (a tiny grey image drawn across the page, no text at all), the
 *    way a scanned or photographed return looks;
 *  - white text (a line nobody sees on paper but a text reader still finds);
 *  - a user password, with the PDF standard security handler's oldest scheme (revision 2, 40-bit
 *    RC4; ISO 32000-1 section 7.6.3). Every PDF reader still opens it with the password and
 *    refuses it without one, which is all the tests need. Never use this to protect anything.
 *
 * Text is written in the font's WinAnsi encoding, so the dash in "Part 3C – Gross ..." and accented
 * letters come through; anything outside it throws instead of being silently dropped.
 */

import { createHash } from "node:crypto";

export interface PdfText {
  /** Left edge of the text, in points from the left of the page. */
  x: number;
  /** Baseline of the text, in points from the BOTTOM of the page (PDF's own direction). */
  y: number;
  text: string;
  /** Font size in points; 8 if left out (the CRA's forms use 7 to 9). */
  size?: number;
  /** "white" draws text that is invisible on a white page. */
  color?: "black" | "white";
}

export interface PdfPage {
  texts?: PdfText[];
  /** Draw a picture across the page (no text unless `texts` adds some). */
  picture?: boolean;
}

export interface PdfOptions {
  /** Lock the file: a reader needs this password to open it. */
  userPassword?: string;
}

// WinAnsiEncoding's bytes for the few characters above Latin-1's printable range that forms use.
const WIN_ANSI_EXTRA: Record<string, number> = {
  "–": 0x96, // en dash
  "—": 0x97, // em dash
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95, // bullet
  "€": 0x80,
};

function winAnsiBytes(text: string): number[] {
  return Array.from(text, (ch) => {
    const extra = WIN_ANSI_EXTRA[ch];
    if (extra !== undefined) return extra;
    const code = ch.charCodeAt(0);
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return code;
    throw new Error(`make-pdf: "${ch}" isn't in WinAnsiEncoding`);
  });
}

const hex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** RC4, written out because current OpenSSL builds no longer offer it. Test use only. */
function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + s[i] + key[i % key.length]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let n = 0; n < data.length; n += 1) {
    i = (i + 1) & 0xff;
    j = (j + s[i]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
    out[n] = data[n] ^ s[(s[i] + s[j]) & 0xff];
  }
  return out;
}

const md5 = (...parts: Uint8Array[]) => {
  const h = createHash("md5");
  for (const p of parts) h.update(p);
  return new Uint8Array(h.digest());
};

// The 32-byte padding string from ISO 32000-1, 7.6.3.3, Algorithm 2.
const PAD = Uint8Array.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function padPassword(password: string): Uint8Array {
  const bytes = Uint8Array.from(winAnsiBytes(password).slice(0, 32));
  const out = new Uint8Array(32);
  out.set(bytes);
  out.set(PAD.subarray(0, 32 - bytes.length), bytes.length);
  return out;
}

interface Security {
  key: Uint8Array;
  owner: Uint8Array;
  user: Uint8Array;
  permissions: number;
  id: Uint8Array;
}

/** Algorithms 2, 3 and 4 of ISO 32000-1 7.6.3 for revision 2 (a 5-byte key). */
function makeSecurity(userPassword: string): Security {
  const id = md5(new TextEncoder().encode(`dotami-test-${userPassword}`));
  const permissions = -44; // print and copy allowed; the value doesn't matter to a reader
  const ownerKey = md5(padPassword(`owner-${userPassword}`)).subarray(0, 5);
  const owner = rc4(ownerKey, padPassword(userPassword));
  const p = new Uint8Array(4);
  new DataView(p.buffer).setInt32(0, permissions, true);
  const key = md5(padPassword(userPassword), owner, p, id).subarray(0, 5);
  const user = rc4(key, PAD);
  return { key, owner, user, permissions, id };
}

/** Algorithm 1: each object's strings and streams get a key made from the file key and its number. */
function objectKey(security: Security, objectNumber: number): Uint8Array {
  const extra = Uint8Array.from([
    objectNumber & 0xff,
    (objectNumber >> 8) & 0xff,
    (objectNumber >> 16) & 0xff,
    0,
    0,
  ]);
  return md5(security.key, extra).subarray(0, 10);
}

function contentStream(page: PdfPage): string {
  const ops: string[] = [];
  if (page.picture) ops.push("q 612 0 0 792 0 0 cm /Im1 Do Q");
  for (const t of page.texts ?? []) {
    const rgb = t.color === "white" ? "1 1 1" : "0 0 0";
    ops.push(`BT ${rgb} rg /F1 ${t.size ?? 8} Tf ${t.x} ${t.y} Td <${hex(winAnsiBytes(t.text))}> Tj ET`);
  }
  return ops.join("\n");
}

/** The PDF's bytes. */
export function makePdf(pages: PdfPage[], options: PdfOptions = {}): Uint8Array {
  const security = options.userPassword !== undefined ? makeSecurity(options.userPassword) : null;
  const latin1 = (s: string) => Uint8Array.from(Array.from(s, (c) => c.charCodeAt(0)));

  // Objects: 1 catalog, 2 page tree, 3 font, 4 image, then a page and its content per page, then
  // (when locked) the encryption dictionary.
  const objects: (Uint8Array | null)[] = [];
  const add = () => objects.push(null); // reserve a number; filled in below

  add(); // 1
  add(); // 2
  add(); // 3
  add(); // 4
  const pageNumbers: number[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    pageNumbers.push(add());
    add();
  }
  const encryptNumber = security ? add() : 0;

  const set = (n: number, body: string | Uint8Array) => {
    objects[n - 1] = typeof body === "string" ? latin1(body) : body;
  };
  const stream = (n: number, dict: string, data: Uint8Array) => {
    const bytes = security ? rc4(objectKey(security, n), data) : data;
    const head = latin1(`<< ${dict} /Length ${bytes.length} >>\nstream\n`);
    const tail = latin1("\nendstream");
    const out = new Uint8Array(head.length + bytes.length + tail.length);
    out.set(head);
    out.set(bytes, head.length);
    out.set(tail, head.length + bytes.length);
    set(n, out);
  };

  set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  set(2, `<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  // A 2 x 2 grey picture, stretched across a page by the page's content.
  stream(4, "/Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 8", Uint8Array.from([200, 120, 120, 200]));
  pages.forEach((page, i) => {
    const pageNumber = pageNumbers[i];
    const contentNumber = pageNumber + 1;
    set(
      pageNumber,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> /XObject << /Im1 4 0 R >> >> /Contents ${contentNumber} 0 R >>`,
    );
    stream(contentNumber, "", latin1(contentStream(page)));
  });
  if (security) {
    set(
      encryptNumber,
      `<< /Filter /Standard /V 1 /R 2 /O <${hex(security.owner)}> /U <${hex(security.user)}> /P ${security.permissions} >>`,
    );
  }

  // Lay the file out and note where each object starts, for the cross-reference table.
  const chunks: Uint8Array[] = [latin1("%PDF-1.4\n%âãÏÓ\n")];
  let offset = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    if (!body) throw new Error(`make-pdf: object ${i + 1} was never written`);
    offsets.push(offset);
    for (const part of [latin1(`${i + 1} 0 obj\n`), body, latin1("\nendobj\n")]) {
      chunks.push(part);
      offset += part.length;
    }
  });
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n `),
  ].join("\n");
  const trailer = [
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R${
      security ? ` /Encrypt ${encryptNumber} 0 R /ID [<${hex(security.id)}> <${hex(security.id)}>]` : ""
    } >>`,
    "startxref",
    String(offset),
    "%%EOF\n",
  ].join("\n");
  chunks.push(latin1(`${xref}\n${trailer}`));

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
