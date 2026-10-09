/**
 * Small receipt files built in code for the tests: real headers, invented content. Pictures built
 * here decode in a browser (the PNG is a whole, valid file); the JPEG and WebP builders only carry
 * the headers DotAmi reads, which is all the server ever looks at.
 */
import { crc32, deflateSync } from "node:zlib";

const u32be = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  return Buffer.concat([u32be(data.length), typeBytes, data, u32be(crc32(Buffer.concat([typeBytes, data])))]);
}

/**
 * A valid PNG of `width` x `height`, filled with one colour. `claim` writes other dimensions into
 * the header than the pixels really have (a file that lies about its size, for the limit tests);
 * then the file no longer decodes, which is the point.
 */
export function png(width: number, height: number, options: { claim?: { width: number; height: number }; rgb?: [number, number, number] } = {}): Buffer {
  const [r, g, b] = options.rgb ?? [200, 40, 40];
  const ihdr = Buffer.concat([u32be(options.claim?.width ?? width), u32be(options.claim?.height ?? height), Buffer.from([8, 2, 0, 0, 0])]);
  // Each row: filter byte 0, then RGB pixels.
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A JPEG's headers: SOI, an APP0 segment, a baseline frame header with this size, EOI. `after` goes before EOI. */
export function jpegHeader(width: number, height: number, after: Buffer = Buffer.alloc(0)): Buffer {
  const app0 = Buffer.concat([Buffer.from([0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF\0", "ascii"), Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0])]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, after, Buffer.from([0xff, 0xd9])]);
}

/** A WebP's headers with an extended (VP8X) chunk giving this canvas size. */
export function webpHeader(width: number, height: number): Buffer {
  const vp8x = Buffer.alloc(10);
  vp8x.writeUIntLE(width - 1, 4, 3);
  vp8x.writeUIntLE(height - 1, 7, 3);
  const chunk = Buffer.concat([Buffer.from("VP8X", "ascii"), Buffer.from([10, 0, 0, 0]), vp8x]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(4 + chunk.length);
  return Buffer.concat([Buffer.from("RIFF", "ascii"), size, Buffer.from("WEBP", "ascii"), chunk]);
}

/** A one-page PDF with a line of text, built by hand with a correct cross-reference table. `extra` adds objects' text to the catalog. */
export function pdf(options: { text?: string; catalogExtra?: string; extraObjects?: string[] } = {}): Buffer {
  const text = options.text ?? "Example receipt";
  const content = `BT /F1 24 Tf 40 100 Td (${text}) Tj ET`;
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R ${options.catalogExtra ?? ""}>>`,
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ...(options.extraObjects ?? []),
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}
