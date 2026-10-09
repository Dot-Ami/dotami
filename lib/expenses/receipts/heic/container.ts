/**
 * [8i] DotAmi's own reader for the HEIC container (ISO/IEC 23008-12, HEIF): which item is the picture,
 * where its bytes are, its size, its tiles and its properties. Written for option D of
 * docs/connectors/heic-decoder-review.md; no package, and no code copied from anyone's reader.
 *
 * It never decodes a picture. It runs on the server and in the window when a receipt is added (to
 * learn the picture's size and refuse a damaged file, sniff.ts) and in the receipt viewer's worker
 * (picture.ts, to pull out the HEVC data for the graphics chip).
 *
 * The bytes are hostile until proven otherwise. Every read is bounds-checked against the box it sits
 * in, every box must lie inside its parent, every count is capped (limits.ts), and every loop moves
 * forward by at least a box header, so no file can make it read outside the bytes, loop forever or
 * allocate more than the file itself. Anything it doesn't understand is either skipped (an unknown
 * box) or refused (a structure it would have to trust). It never throws for a bad file: it answers
 * `{ ok: false }`, and a thrown error is caught at the edge and treated the same way.
 */

import { MAX_BOXES, MAX_EXTENTS, MAX_ITEMS, MAX_PROPERTIES } from "./limits";

/** A box: its four-letter type and where its content starts and ends in the file. */
export interface Box {
  type: string;
  /** First byte of the box (its size field). */
  start: number;
  /** First byte after its header. */
  content: number;
  /** First byte after the box. */
  end: number;
}

export interface Item {
  id: number;
  /** Four letters: `hvc1` (a coded picture), `grid`, `Exif`, `mime`, `iovl`… "" for an entry too old to say. */
  type: string;
  /** Non-zero: the item is encrypted, which a receipt photo never is. */
  protection: number;
  hidden: boolean;
}

export interface Location {
  /** 0: bytes in this file; 1: bytes in the `idat` box; 2: built from other items (refused when needed). */
  method: number;
  /** 0: this file. Anything else points to another file, which DotAmi never follows. */
  dataReference: number;
  extents: { offset: number; length: number }[];
}

/** One property an item is associated with: its box, and whether a reader must understand it. */
export interface Association {
  property: Box;
  essential: boolean;
}

export interface Heif {
  majorBrand: string;
  brands: string[];
  primary: number;
  items: Map<number, Item>;
  locations: Map<number, Location>;
  /** Item id → its properties, in the order the file lists them (the order transformations apply in). */
  associations: Map<number, Association[]>;
  /** Reference type (`dimg`, `thmb`, `auxl`, `cdsc`…) → from-item id → to-item ids, in order. */
  references: Map<string, Map<number, number[]>>;
  /** The `idat` box's content, if there is one. */
  idat: Box | null;
}

export type ParseResult = { ok: true; heif: Heif } | { ok: false };

/** Thrown inside the reader at the first thing that doesn't add up; never escapes parseHeif. */
class Damaged extends Error {}
const fail = (): never => {
  throw new Damaged("damaged");
};

/** Bounds-checked big-endian reads. `end` is the end of the box being read, never the file's. */
class Reader {
  constructor(
    readonly bytes: Uint8Array,
    public at: number,
    readonly end: number,
  ) {
    if (at < 0 || end > bytes.length || at > end) fail();
  }
  need(n: number) {
    if (n < 0 || this.at + n > this.end) fail();
  }
  u8(): number {
    this.need(1);
    return this.bytes[this.at++];
  }
  u16(): number {
    this.need(2);
    const v = (this.bytes[this.at] << 8) | this.bytes[this.at + 1];
    this.at += 2;
    return v;
  }
  u32(): number {
    this.need(4);
    const b = this.bytes;
    // `>>> 0` keeps a value with the top bit set positive.
    const v = ((b[this.at] << 24) | (b[this.at + 1] << 16) | (b[this.at + 2] << 8) | b[this.at + 3]) >>> 0;
    this.at += 4;
    return v;
  }
  /** A 64-bit value, refused if it can't be an offset or a length in a file DotAmi would read. */
  u64(): number {
    const high = this.u32();
    const low = this.u32();
    if (high > 0x1fffff) fail(); // over 2^53: no file is that big
    return high * 0x1_0000_0000 + low;
  }
  /** An unsigned value of 0, 4 or 8 bytes, as `iloc` declares its field sizes. */
  sized(size: number): number {
    if (size === 0) return 0;
    if (size === 4) return this.u32();
    if (size === 8) return this.u64();
    return fail();
  }
  fourcc(): string {
    this.need(4);
    const s = String.fromCharCode(this.bytes[this.at], this.bytes[this.at + 1], this.bytes[this.at + 2], this.bytes[this.at + 3]);
    this.at += 4;
    return s;
  }
  skip(n: number) {
    this.need(n);
    this.at += n;
  }
  /** Version and flags of a "full box". */
  full(): { version: number; flags: number } {
    const version = this.u8();
    const flags = (this.u8() << 16) | (this.u8() << 8) | this.u8();
    return { version, flags };
  }
  /** A null-terminated string; a missing terminator at the box's end is tolerated. */
  cstring(): string {
    let s = "";
    while (this.at < this.end) {
      const c = this.bytes[this.at++];
      if (c === 0) return s;
      if (s.length < 256) s += String.fromCharCode(c);
    }
    return s;
  }
}

/** Counts every box visited, across the whole file, against MAX_BOXES. */
class Budget {
  boxes = 0;
  spend() {
    this.boxes += 1;
    if (this.boxes > MAX_BOXES) fail();
  }
}

/**
 * The boxes directly inside [from, to). A box must start where the last one ended and end inside
 * the range; a size of 0 means "to the end of the range"; a size of 1 means a 64-bit size follows.
 */
function childBoxes(bytes: Uint8Array, from: number, to: number, budget: Budget): Box[] {
  const boxes: Box[] = [];
  let at = from;
  while (at < to) {
    budget.spend();
    const r = new Reader(bytes, at, to);
    let size = r.u32();
    const type = r.fourcc();
    if (size === 1) size = r.u64();
    else if (size === 0) size = to - at;
    if (type === "uuid") r.skip(16);
    const content = r.at;
    // Each box at least covers its own header (so every step moves forward) and stays inside its parent.
    if (size < content - at || at + size > to) fail();
    boxes.push({ type, start: at, content, end: at + size });
    at += size;
  }
  return boxes;
}

/** The one box of a type among `boxes`; two of a kind that must be unique is a damaged file. */
function single(boxes: Box[], type: string): Box | null {
  const found = boxes.filter((b) => b.type === type);
  if (found.length > 1) fail();
  return found[0] ?? null;
}

function readFtyp(bytes: Uint8Array, box: Box): { major: string; brands: string[] } {
  const r = new Reader(bytes, box.content, box.end);
  const major = r.fourcc();
  r.u32(); // minor version
  const brands: string[] = [];
  // At most 64 compatible brands; real files list a handful.
  while (r.at + 4 <= box.end && brands.length < 64) brands.push(r.fourcc());
  return { major, brands };
}

function readHdlr(bytes: Uint8Array, box: Box): string {
  const r = new Reader(bytes, box.content, box.end);
  r.full();
  r.u32(); // pre_defined
  return r.fourcc();
}

function readPitm(bytes: Uint8Array, box: Box): number {
  const r = new Reader(bytes, box.content, box.end);
  const { version } = r.full();
  return version === 0 ? r.u16() : r.u32();
}

function readIinf(bytes: Uint8Array, box: Box, budget: Budget): Map<number, Item> {
  const r = new Reader(bytes, box.content, box.end);
  const { version } = r.full();
  const count = version === 0 ? r.u16() : r.u32();
  if (count > MAX_ITEMS) fail();
  const items = new Map<number, Item>();
  for (const entry of childBoxes(bytes, r.at, box.end, budget)) {
    if (entry.type !== "infe") continue;
    const e = new Reader(bytes, entry.content, entry.end);
    const { version: v, flags } = e.full();
    let item: Item;
    if (v >= 2) {
      const id = v === 2 ? e.u16() : e.u32();
      const protection = e.u16();
      const type = e.fourcc();
      item = { id, type, protection, hidden: (flags & 1) === 1 };
    } else {
      // Versions 0 and 1 name no item type; such an item is never one DotAmi draws.
      const id = e.u16();
      const protection = e.u16();
      item = { id, type: "", protection, hidden: false };
    }
    if (items.has(item.id)) fail();
    items.set(item.id, item);
    if (items.size > MAX_ITEMS) fail();
  }
  // The declared count isn't checked against the entries found: only the entries are used, and
  // both are capped above.
  return items;
}

function readIloc(bytes: Uint8Array, box: Box): Map<number, Location> {
  const r = new Reader(bytes, box.content, box.end);
  const { version } = r.full();
  if (version > 2) fail();
  const sizes1 = r.u8();
  const sizes2 = r.u8();
  const offsetSize = sizes1 >> 4;
  const lengthSize = sizes1 & 0x0f;
  const baseOffsetSize = sizes2 >> 4;
  const indexSize = version === 1 || version === 2 ? sizes2 & 0x0f : 0;
  const count = version < 2 ? r.u16() : r.u32();
  if (count > MAX_ITEMS) fail();
  const locations = new Map<number, Location>();
  for (let i = 0; i < count; i += 1) {
    const id = version < 2 ? r.u16() : r.u32();
    const method = version === 1 || version === 2 ? r.u16() & 0x0f : 0;
    const dataReference = r.u16();
    const base = r.sized(baseOffsetSize);
    const extentCount = r.u16();
    if (extentCount > MAX_EXTENTS) fail();
    const extents: Location["extents"] = [];
    for (let e = 0; e < extentCount; e += 1) {
      if (indexSize > 0) r.sized(indexSize);
      const offset = base + r.sized(offsetSize);
      const length = r.sized(lengthSize);
      if (!Number.isSafeInteger(offset)) fail();
      extents.push({ offset, length });
    }
    if (locations.has(id)) fail();
    locations.set(id, { method, dataReference, extents });
  }
  return locations;
}

function readIref(bytes: Uint8Array, box: Box, budget: Budget): Map<string, Map<number, number[]>> {
  const r = new Reader(bytes, box.content, box.end);
  const { version } = r.full();
  const refs = new Map<string, Map<number, number[]>>();
  let total = 0;
  for (const ref of childBoxes(bytes, r.at, box.end, budget)) {
    const e = new Reader(bytes, ref.content, ref.end);
    const from = version === 0 ? e.u16() : e.u32();
    const count = e.u16();
    total += count;
    if (total > MAX_ITEMS * 4) fail();
    const to: number[] = [];
    for (let i = 0; i < count; i += 1) to.push(version === 0 ? e.u16() : e.u32());
    const byFrom = refs.get(ref.type) ?? new Map<number, number[]>();
    // One reference box per type and from-item; a second would make the tile order ambiguous.
    if (byFrom.has(from)) fail();
    byFrom.set(from, to);
    refs.set(ref.type, byFrom);
  }
  return refs;
}

function readIprp(bytes: Uint8Array, box: Box, budget: Budget): Map<number, Association[]> {
  const children = childBoxes(bytes, box.content, box.end, budget);
  const ipco = single(children, "ipco");
  if (!ipco) fail();
  const properties = childBoxes(bytes, ipco!.content, ipco!.end, budget);
  if (properties.length > MAX_PROPERTIES) fail();
  const associations = new Map<number, Association[]>();
  for (const ipma of children.filter((b) => b.type === "ipma")) {
    const r = new Reader(bytes, ipma.content, ipma.end);
    const { version, flags } = r.full();
    const count = r.u32();
    if (count > MAX_ITEMS) fail();
    for (let i = 0; i < count; i += 1) {
      const id = version < 1 ? r.u16() : r.u32();
      const n = r.u8();
      const list: Association[] = [];
      for (let a = 0; a < n; a += 1) {
        let essential: boolean;
        let index: number;
        if (flags & 1) {
          const v = r.u16();
          essential = (v & 0x8000) !== 0;
          index = v & 0x7fff;
        } else {
          const v = r.u8();
          essential = (v & 0x80) !== 0;
          index = v & 0x7f;
        }
        // Index 0 means "no property"; one past the list is a damaged file.
        if (index === 0) continue;
        if (index > properties.length) fail();
        list.push({ property: properties[index - 1], essential });
      }
      // An item listed twice (in one ipma or across two) would make its properties ambiguous.
      if (associations.has(id)) fail();
      associations.set(id, list);
    }
  }
  return associations;
}

/** The brands, then the `meta` box and its parts. Throws Damaged; parseHeif turns that into an answer. */
function read(bytes: Uint8Array): Heif {
  const budget = new Budget();
  const top = childBoxes(bytes, 0, bytes.length, budget);
  // The brand box must come first, as the format requires and as sniff.ts reads it.
  if (top.length === 0 || top[0].type !== "ftyp") fail();
  const { major, brands } = readFtyp(bytes, top[0]);
  const metaBox = single(top, "meta");
  if (!metaBox) fail();
  const meta = metaBox!;
  // `meta` is a full box: four bytes of version and flags before its children.
  const metaReader = new Reader(bytes, meta.content, meta.end);
  metaReader.full();
  const parts = childBoxes(bytes, metaReader.at, meta.end, budget);

  const hdlr = single(parts, "hdlr");
  if (!hdlr || readHdlr(bytes, hdlr) !== "pict") fail();
  const pitm = single(parts, "pitm");
  const iinf = single(parts, "iinf");
  const iloc = single(parts, "iloc");
  const iprp = single(parts, "iprp");
  if (!pitm || !iinf || !iloc || !iprp) fail();
  const iref = single(parts, "iref");
  const idat = single(parts, "idat");

  const heif: Heif = {
    majorBrand: major,
    brands,
    primary: readPitm(bytes, pitm!),
    items: readIinf(bytes, iinf!, budget),
    locations: readIloc(bytes, iloc!),
    associations: readIprp(bytes, iprp!, budget),
    references: iref ? readIref(bytes, iref, budget) : new Map(),
    idat,
  };
  if (!heif.items.has(heif.primary)) fail();
  return heif;
}

/** Reads a HEIF file's structure. Never throws. */
export function parseHeif(bytes: Uint8Array): ParseResult {
  try {
    return { ok: true, heif: read(bytes) };
  } catch {
    // A Damaged file, or anything unexpected while reading one: either way, not a file to trust.
    return { ok: false };
  }
}

/** The four letters of the brand box at the very start of a file, or null when it has none. */
export function brandsOf(bytes: Uint8Array): { major: string; brands: string[] } | null {
  try {
    const r = new Reader(bytes, 0, bytes.length);
    const size = r.u32();
    if (r.fourcc() !== "ftyp" || size < 16 || size > bytes.length) return null;
    return readFtyp(bytes, { type: "ftyp", start: 0, content: 8, end: size });
  } catch {
    return null;
  }
}

/** An item's properties of one type, in file order. */
export function propertiesOf(heif: Heif, id: number, type: string): Association[] {
  return (heif.associations.get(id) ?? []).filter((a) => a.property.type === type);
}

/** The width and height in an item's `ispe` property, or null when it has none (or two). */
export function sizeOf(bytes: Uint8Array, heif: Heif, id: number): { width: number; height: number } | null {
  const ispe = propertiesOf(heif, id, "ispe");
  if (ispe.length !== 1) return null;
  try {
    const r = new Reader(bytes, ispe[0].property.content, ispe[0].property.end);
    r.full();
    return { width: r.u32(), height: r.u32() };
  } catch {
    return null;
  }
}

/** The items a reference of `type` points to from `from`, in order; [] when there is none. */
export const referencesFrom = (heif: Heif, type: string, from: number): number[] => heif.references.get(type)?.get(from) ?? [];

/**
 * An item's bytes, joined from its extents: only data in this file (or its `idat` box), every extent
 * inside the bytes it points into, the whole no longer than `maxBytes`. A length of 0 means "to the
 * end", as the format allows. null for anything else: data in another file, data built from other
 * items, an extent past the end (a truncated file), or an item with no location.
 */
export function itemData(bytes: Uint8Array, heif: Heif, id: number, maxBytes: number): Uint8Array | null {
  const location = heif.locations.get(id);
  if (!location || location.dataReference !== 0 || location.extents.length === 0) return null;
  let source: { start: number; end: number };
  if (location.method === 0) source = { start: 0, end: bytes.length };
  else if (location.method === 1 && heif.idat) source = { start: heif.idat.content, end: heif.idat.end };
  else return null;

  const pieces: { from: number; to: number }[] = [];
  let total = 0;
  for (const { offset, length } of location.extents) {
    const from = source.start + offset;
    const to = length === 0 ? source.end : from + length;
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < source.start || to > source.end || to <= from) return null;
    total += to - from;
    if (total > maxBytes) return null;
    pieces.push({ from, to });
  }
  if (pieces.length === 1) return bytes.subarray(pieces[0].from, pieces[0].to);
  const joined = new Uint8Array(total);
  let at = 0;
  for (const { from, to } of pieces) {
    joined.set(bytes.subarray(from, to), at);
    at += to - from;
  }
  return joined;
}

/** Reads the bytes of a property box's content with bounds checks; exported for picture.ts. */
export function propertyReader(bytes: Uint8Array, box: Box): Reader {
  return new Reader(bytes, box.content, box.end);
}

export type { Reader };
export { Damaged };
