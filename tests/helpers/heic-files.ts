/**
 * Small HEIC files built in code for the tests ([8i], option D of docs/connectors/heic-decoder-review.md).
 *
 * The HEVC data inside them is real and tiny: four 128 × 128 pictures, each one flat colour (red,
 * green, blue, white), encoded once on 2026-10-09 by WebCodecs' VideoEncoder in DotAmi's own Electron
 * 44.5.1 (Chromium 152) on a computer with an Intel graphics chip, and copied here as hex. They decode
 * on a computer whose graphics chip decodes HEVC; in Playwright's Chromium (no HEVC) they don't, which
 * is the point of the "can't show" tests. Everything around them (the HEIC container) is built here, so
 * the tests can also build hostile files: truncated, lying about sizes, looping, pointing outside.
 */

/** The decoder configuration record (`hvcC`) the encoder gave: HEVC Main, 8-bit 4:2:0, one VPS, SPS and PPS. */
export const INVENTED_HVCC = Buffer.from(
  "010140000000900000000000baf000fcfdf8f800000f03a00001002240010c01ffff2140000003009000000300000300ba3c0c0000030004000003000540a1000100384201012140000003009000000300000300baa01020205a3ee46c13ff6028010000030001000003000161adef7e000011e1a300003ef14880a2000100074401c0253c06d9",
  "hex",
);

/** One coded 128 × 128 picture per colour: a prefix SEI and one key slice (IDR), each behind a 4-byte length. */
export const INVENTED_TILES = [
  "0000001a4e01000a80000003002bf21fe7641001060000030000030000800000001d2601ae80d39e909ba5a38066a3172fb250f8242039b45c9f203f5eb680",
  "0000001a4e01000a80000003002bf21fe7641001060000030000030000800000001c2601ae80d39e9086819a697872e8810f1a242039b47f5f203f5eb680",
  "0000001a4e01000a80000003002bf21fe764100106000003000003000080000000202601ae80d39e909be645e1f2669ee87ab3f0d14ed47de401e2e009b90195e8bd",
  "0000001a4e01000a80000003002bf21fe7641001060000030000030000800000001926" + "01ae80d206cd29c3acf562b6fac65c169ec4201b02f5337f",
].map((hex) => Buffer.from(hex, "hex"));

/** What each invented tile decodes to (RGB, approximately: HEVC is lossy). */
export const INVENTED_COLOURS: [number, number, number][] = [
  [255, 0, 0],
  [0, 160, 0],
  [0, 0, 255],
  [255, 255, 255],
];

export const TILE = 128;

const u8 = (n: number) => Buffer.from([n & 0xff]);
const u16 = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
};
const u32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};
const i32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n);
  return b;
};

/** A box: its 32-bit size, its four letters, its content. */
export const box = (type: string, ...content: Buffer[]) => {
  const body = Buffer.concat(content);
  return Buffer.concat([u32(8 + body.length), Buffer.from(type, "latin1"), body]);
};
/** A full box: a box whose content starts with a version byte and three bytes of flags. */
export const fullBox = (type: string, version: number, flags: number, ...content: Buffer[]) =>
  box(type, u8(version), Buffer.from([(flags >> 16) & 0xff, (flags >> 8) & 0xff, flags & 0xff]), ...content);

export const ftyp = (major: string, compatible: string[]) => box("ftyp", Buffer.from(major, "latin1"), u32(0), ...compatible.map((b) => Buffer.from(b, "latin1")));

export const ispe = (width: number, height: number) => fullBox("ispe", 0, 0, u32(width), u32(height));

/** A piece of an item's data: offset into the mdat content (or the idat content) and length. */
export interface Extent {
  offset: number;
  length: number;
}

/** One item's place: in this file's mdat (method 0) or in idat (method 1), one or more extents. */
interface Placed {
  id: number;
  method: 0 | 1;
  extents: Extent[];
  dataReference?: number;
}

export interface HeicOptions {
  /** "grid" (default): a grid of the invented tiles; "single": one coded picture as the primary item. */
  layout?: "grid" | "single";
  /** For a grid: rows, columns, the output size and which invented tile goes where (default: 2 × 2, 256 × 256, tiles 0-3). */
  grid?: { rows: number; columns: number; width: number; height: number; tiles: number[] };
  /** For a single picture: which invented tile (default 0). */
  single?: number;
  major?: string;
  compatible?: string[];
  /** Properties after the size on the primary, in this order: `irot` quarter turns, `imir` axis, `clap` [wN, wD, hN, hD, hoN, hoD, voN, voD]. */
  transforms?: (["irot", number] | ["imir", number] | ["clap", number[]])[];
  /** The primary picture's `ispe`, if not the true size. */
  primarySize?: { width: number; height: number };
  /** Each tile's `ispe`, if not 128 × 128. */
  tileSize?: { width: number; height: number };
  /** The `hvcC` record to use instead of the invented one. */
  hvcc?: Buffer;
  /** Replaces a tile's coded data. */
  tileData?: (index: number, data: Buffer) => Buffer;
  /** What else an iPhone puts in a file: a thumbnail, an Exif block, a depth or gain map (auxiliary picture). */
  extras?: boolean;
  /** An unknown property on the primary, marked essential. */
  unknownEssential?: boolean;
  /** The primary's data (a single picture) or every tile's data in another file. */
  dataInAnotherFile?: boolean;
  /** The grid's `dimg` references, if not the tiles' ids in order. */
  dimg?: number[];
  /** The item type of the tiles, if not `hvc1`. */
  tileType?: string;
  /** The primary item's type, if not `grid` / `hvc1`. */
  primaryType?: string;
  /**
   * Where each tile's data is said to be, if not its own bytes in one piece: given the tile's index,
   * its own place and the whole mdat content's length. For split, shared and overlapping data.
   */
  tileExtents?: (index: number, own: Extent, mdatLength: number) => Extent[];
}

/** A HEIC file, laid out the way an iPhone writes one: ftyp, meta (with the grid descriptor in idat), mdat. */
export function heic(options: HeicOptions = {}): Buffer {
  const layout = options.layout ?? "grid";
  const grid = options.grid ?? { rows: 2, columns: 2, width: 2 * TILE, height: 2 * TILE, tiles: [0, 1, 2, 3] };
  const tileIndexes = layout === "grid" ? grid.tiles : [options.single ?? 0];
  const tileBytes = tileIndexes.map((t, i) => (options.tileData ? options.tileData(i, INVENTED_TILES[t]) : INVENTED_TILES[t]));
  const primaryId = 1;
  const tileIds = layout === "grid" ? tileIndexes.map((_, i) => 2 + i) : [primaryId];
  const thumbId = 100;
  const exifId = 101;
  const depthId = 102;

  // mdat content: each tile, then the extras.
  const mdatParts: Buffer[] = [];
  const placed: Placed[] = [];
  let at = 0;
  const putMdat = (id: number, data: Buffer) => {
    placed.push({ id, method: 0, extents: [{ offset: at, length: data.length }], dataReference: options.dataInAnotherFile && tileIds.includes(id) ? 1 : 0 });
    mdatParts.push(data);
    at += data.length;
  };
  tileIds.forEach((id, i) => putMdat(id, tileBytes[i]));
  const exif = Buffer.from("\0\0\0\0Exif\0\0MM\0*invented", "latin1");
  if (options.extras) {
    putMdat(thumbId, INVENTED_TILES[3]);
    putMdat(exifId, exif);
    putMdat(depthId, INVENTED_TILES[2]);
  }

  // idat: the grid descriptor (version 0, 16-bit sizes).
  const descriptor = Buffer.concat([u8(0), u8(0), u8(grid.rows - 1), u8(grid.columns - 1), u16(grid.width), u16(grid.height)]);
  if (layout === "grid") placed.push({ id: primaryId, method: 1, extents: [{ offset: 0, length: descriptor.length }] });
  if (options.tileExtents) {
    for (const p of placed) {
      const index = tileIds.indexOf(p.id);
      if (p.method === 0 && index >= 0) p.extents = options.tileExtents(index, p.extents[0], at);
    }
  }

  // Items.
  const infe = (id: number, type: string, hidden = false) => fullBox("infe", 2, hidden ? 1 : 0, u16(id), u16(0), Buffer.from(type, "latin1"), Buffer.from("\0", "latin1"));
  const items = [infe(primaryId, options.primaryType ?? (layout === "grid" ? "grid" : "hvc1"))];
  if (layout === "grid") tileIds.forEach((id) => items.push(infe(id, options.tileType ?? "hvc1", true)));
  if (options.extras) items.push(infe(thumbId, "hvc1", true), infe(exifId, "Exif", true), infe(depthId, "hvc1", true));
  const iinf = fullBox("iinf", 0, 0, u16(items.length), ...items);

  // References: the grid's tiles; the extras point at the primary.
  const refs: Buffer[] = [];
  if (layout === "grid") {
    const to = options.dimg ?? tileIds;
    refs.push(box("dimg", u16(primaryId), u16(to.length), ...to.map(u16)));
  }
  if (options.extras) {
    refs.push(box("thmb", u16(thumbId), u16(1), u16(primaryId)));
    refs.push(box("cdsc", u16(exifId), u16(1), u16(primaryId)));
    refs.push(box("auxl", u16(depthId), u16(1), u16(primaryId)));
  }
  const iref = refs.length ? fullBox("iref", 0, 0, ...refs) : Buffer.alloc(0);

  // Properties: 1 hvcC, 2 the tiles' size, 3 the primary's size, then the transforms, then the extras.
  const tileSize = options.tileSize ?? { width: TILE, height: TILE };
  const shownSize = options.primarySize ?? (layout === "grid" ? { width: grid.width, height: grid.height } : tileSize);
  const props: Buffer[] = [box("hvcC", options.hvcc ?? INVENTED_HVCC), ispe(tileSize.width, tileSize.height), ispe(shownSize.width, shownSize.height)];
  const transformIndexes: number[] = [];
  for (const t of options.transforms ?? []) {
    if (t[0] === "irot") props.push(box("irot", u8(t[1])));
    else if (t[0] === "imir") props.push(box("imir", u8(t[1])));
    else {
      const v = t[1];
      props.push(box("clap", u32(v[0]), u32(v[1]), u32(v[2]), u32(v[3]), i32(v[4]), u32(v[5]), i32(v[6]), u32(v[7])));
    }
    transformIndexes.push(props.length);
  }
  let unknownIndex = 0;
  if (options.unknownEssential) {
    props.push(box("zzzz", u32(1)));
    unknownIndex = props.length;
  }
  let auxIndex = 0;
  if (options.extras) {
    props.push(fullBox("auxC", 0, 0, Buffer.from("urn:com:apple:photo:2020:aux:hdrgainmap\0", "latin1")));
    auxIndex = props.length;
  }
  const ipco = box("ipco", ...props);

  // Associations (version 0, flags 0: 16-bit ids, 7-bit indexes with the essential bit on top).
  const assoc = (id: number, list: [number, boolean][]) => Buffer.concat([u16(id), u8(list.length), ...list.map(([i, e]) => u8((e ? 0x80 : 0) | i))]);
  const entries: Buffer[] = [];
  const transforms = transformIndexes.map((i) => [i, true] as [number, boolean]);
  const extra = unknownIndex ? [[unknownIndex, true] as [number, boolean]] : [];
  if (layout === "grid") {
    entries.push(assoc(primaryId, [[3, false], ...transforms, ...extra]));
    tileIds.forEach((id) => entries.push(assoc(id, [[1, true], [2, false]])));
  } else {
    entries.push(assoc(primaryId, [[1, true], [3, false], ...transforms, ...extra]));
  }
  if (options.extras) {
    entries.push(assoc(thumbId, [[1, true], [2, false]]));
    entries.push(assoc(depthId, [[1, true], [2, false], [auxIndex, true]]));
  }
  const ipma = fullBox("ipma", 0, 0, u32(entries.length), ...entries);
  const iprp = box("iprp", ipco, ipma);

  const hdlr = fullBox("hdlr", 0, 0, u32(0), Buffer.from("pict", "latin1"), Buffer.alloc(12), Buffer.from("\0", "latin1"));
  const pitm = fullBox("pitm", 0, 0, u16(primaryId));
  const idat = layout === "grid" ? box("idat", descriptor) : Buffer.alloc(0);
  const ftypBox = ftyp(options.major ?? "heic", options.compatible ?? ["mif1", "heic"]);

  // iloc offsets are absolute in the file, so the meta box is built once to learn its size, then for real.
  const build = (mdatStart: number) => {
    const ilocEntries = placed.map((p) =>
      Buffer.concat([
        u16(p.id),
        u16(p.method),
        u16(p.dataReference ?? 0),
        u16(p.extents.length),
        ...p.extents.flatMap((e) => [u32(p.method === 0 ? mdatStart + e.offset : e.offset), u32(e.length)]),
      ]),
    );
    const iloc = fullBox("iloc", 1, 0, u8(0x44), u8(0x00), u16(placed.length), ...ilocEntries);
    return fullBox("meta", 0, 0, hdlr, pitm, iloc, iinf, iref, iprp, idat);
  };
  const metaSize = build(0).length;
  const meta = build(ftypBox.length + metaSize + 8);
  return Buffer.concat([ftypBox, meta, box("mdat", ...mdatParts)]);
}
