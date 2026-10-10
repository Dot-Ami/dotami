/**
 * [8i] What DotAmi accepts as a HEIC receipt, and what it hands to the graphics chip to show one.
 * Built on DotAmi's own container reader (container.ts) and HEVC header checks (hevc.ts); the
 * conditions are the maintainer's choice of option D (docs/connectors/heic-decoder-review.md
 * § What was chosen):
 *
 *   - One still picture only: the file's primary item, either one coded picture (`hvc1`) or a `grid`
 *     of coded tiles, with optional crop (`clap`), rotation (`irot`) and mirroring (`imir`). An image
 *     sequence is refused. Thumbnails, depth and gain maps, alpha and other auxiliary pictures, Exif
 *     and other derived items are never handed to the decoder: only the primary picture's own data is.
 *     A primary item of any other kind (an overlay, a tone-mapped picture, another codec) isn't drawn.
 *   - Its data only from this file: an item whose bytes are in another file, built from other items,
 *     or encrypted, is not drawn.
 *   - HEVC Main or Main Still Picture, 8-bit 4:2:0, exactly one VPS, SPS and PPS (hevc.ts).
 *   - Every tile the size the grid's tiles declare, each tile exactly as big as its SPS says, and no
 *     more tiles than the picture's size needs.
 *   - The picture at most 50 megapixels and 20,000 pixels a side (types.ts), before anything decodes;
 *     every tile, at its declared size and at the coded size its SPS gives the decoder, within the
 *     same caps; and all the tiles together at most MAX_DECODED_PIXELS (limits.ts).
 *   - All the picture's data together no more than the file holds (container.ts, ByteBudget): tiles
 *     that point at the same bytes are refused, not copied over and over.
 *
 * heicHeader is what the store and the window check when a receipt is added: the brands, a container
 * that reads, the picture's size within the caps, and its data inside the file. heicPicture is what the
 * viewer's worker checks before decoding: everything above.
 */

import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, MAX_RECEIPT_BYTES } from "../types";
import { brandsOf, ByteBudget, itemData, itemExtents, parseHeif, propertiesOf, propertyReader, referencesFrom, sizeOf, type Association, type Heif } from "./container";
import { checkTileData, readHvcc, type HevcConfig } from "./hevc";
import { HEIC_FAMILY_BRANDS, HEIC_MAJOR_BRANDS, HEIF_SEQUENCE_BRANDS, MAX_DECODED_PIXELS, MAX_TILES } from "./limits";

/**
 * Why a HEIC is refused or not drawn:
 *   - "not-heic": its brands aren't a HEIC photo's (sniff.ts then names what it is);
 *   - "sequence": a burst, an animation or a layered picture, not one still photo;
 *   - "damaged": the container doesn't read, or points outside the file;
 *   - "too-many-pixels": over the picture caps;
 *   - "not-shown": a well-formed HEIC of a kind DotAmi doesn't draw (10-bit, an overlay…).
 */
export type HeicRefusal = "not-heic" | "sequence" | "damaged" | "too-many-pixels" | "not-shown";

/** Is this the brand box of a HEIC photo DotAmi accepts? (The review's corrected rule.) */
export function heicBrands(bytes: Uint8Array): "heic" | "sequence" | "not-heic" {
  const ftyp = brandsOf(bytes);
  if (!ftyp) return "not-heic";
  const all = [ftyp.major, ...ftyp.brands];
  const isMajor = (HEIC_MAJOR_BRANDS as readonly string[]).includes(ftyp.major);
  const family = ftyp.brands.some((b) => (HEIC_FAMILY_BRANDS as readonly string[]).includes(b));
  const heic = isMajor && (ftyp.major !== "mif1" || family);
  const sequence = all.some((b) => (HEIF_SEQUENCE_BRANDS as readonly string[]).includes(b));
  // A sequence brand anywhere: never one still photo, whatever else the file says it is.
  if (sequence && (heic || (HEIF_SEQUENCE_BRANDS as readonly string[]).includes(ftyp.major))) return "sequence";
  return heic ? "heic" : "not-heic";
}

const overCaps = (w: number, h: number) => w > MAX_IMAGE_SIDE || h > MAX_IMAGE_SIDE || w * h > MAX_IMAGE_PIXELS;

/** The picture's items, before any HEVC check: the primary and, for a grid, its tiles in order. */
interface Layout {
  primary: number;
  width: number;
  height: number;
  /** For a single picture, [primary]. */
  tiles: number[];
  grid: { rows: number; columns: number } | null;
}

type LayoutResult = { ok: true; layout: Layout } | { ok: false; code: HeicRefusal };

/** The grid descriptor (ISO/IEC 23008-12 6.6.2.3.2): exactly 8 or 12 bytes. */
function readGrid(data: Uint8Array): { rows: number; columns: number; width: number; height: number } | null {
  if (data.length < 8 || data[0] !== 0) return null;
  const wide = (data[1] & 1) === 1;
  if (data.length !== (wide ? 12 : 8)) return null;
  const rows = data[2] + 1;
  const columns = data[3] + 1;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = wide ? view.getUint32(4) : view.getUint16(4);
  const height = wide ? view.getUint32(8) : view.getUint16(6);
  return { rows, columns, width, height };
}

/** Finds the primary picture and its tiles, and checks the sizes and where the data is. */
function layoutOf(bytes: Uint8Array, heif: Heif): LayoutResult {
  const primary = heif.items.get(heif.primary)!;
  const size = sizeOf(bytes, heif, primary.id);
  if (!size || size.width <= 0 || size.height <= 0) return { ok: false, code: "damaged" };
  if (overCaps(size.width, size.height)) return { ok: false, code: "too-many-pixels" };
  // All the picture's data together may be no more than the file holds (container.ts, ByteBudget).
  // Only checked here, never copied: this runs on the server and in the window when a receipt is added.
  const budget = ByteBudget.forFile(bytes, MAX_RECEIPT_BYTES);

  if (primary.type === "hvc1") {
    if (!itemExtents(bytes, heif, primary.id, budget)) return { ok: false, code: "damaged" };
    return { ok: true, layout: { primary: primary.id, width: size.width, height: size.height, tiles: [primary.id], grid: null } };
  }
  if (primary.type !== "grid") return { ok: false, code: "not-shown" };

  // The descriptor is 8 or 12 bytes; its own small budget means it can never copy more than 16.
  const descriptor = itemData(bytes, heif, primary.id, new ByteBudget(16));
  const grid = descriptor ? readGrid(descriptor) : null;
  if (!grid) return { ok: false, code: "damaged" };
  // The grid's output size is the picture's size; its own `ispe` must agree.
  if (grid.width !== size.width || grid.height !== size.height) return { ok: false, code: "damaged" };
  const tiles = referencesFrom(heif, "dimg", primary.id);
  if (tiles.length !== grid.rows * grid.columns || tiles.length > MAX_TILES) return { ok: false, code: "damaged" };
  for (const id of tiles) {
    const tile = heif.items.get(id);
    if (!tile) return { ok: false, code: "damaged" };
    // A tile is a coded picture: never the grid itself, another grid, or anything derived (no loops).
    if (tile.type !== "hvc1") return { ok: false, code: "not-shown" };
    // Each tile within the caps on its own, and all of them together within what the chip may decode.
    // Checked when the receipt is added, so a file that would ask for a huge decode is never kept.
    const tileSize = sizeOf(bytes, heif, id);
    if (!tileSize || tileSize.width <= 0 || tileSize.height <= 0) return { ok: false, code: "damaged" };
    if (overCaps(tileSize.width, tileSize.height) || tiles.length * tileSize.width * tileSize.height > MAX_DECODED_PIXELS) {
      return { ok: false, code: "too-many-pixels" };
    }
    if (!itemExtents(bytes, heif, id, budget)) return { ok: false, code: "damaged" };
  }
  return { ok: true, layout: { primary: primary.id, width: size.width, height: size.height, tiles, grid: { rows: grid.rows, columns: grid.columns } } };
}

export type HeaderResult = { ok: true; width: number; height: number } | { ok: false; code: HeicRefusal };

/**
 * What the store checks when a HEIC receipt is added (sniff.ts): its brands, a container that reads,
 * a primary picture with a size inside the caps, and that picture's data inside the file. It doesn't
 * check the HEVC inside: a well-formed HEIC DotAmi can't draw (a 10-bit one) is still kept, and the
 * viewer says it can't show it.
 */
export function heicHeader(bytes: Uint8Array): HeaderResult {
  const brands = heicBrands(bytes);
  if (brands !== "heic") return { ok: false, code: brands };
  const parsed = parseHeif(bytes);
  if (!parsed.ok) return { ok: false, code: "damaged" };
  const layout = layoutOf(bytes, parsed.heif);
  if (!layout.ok) {
    // A kind the viewer won't draw is still a HEIC photo to keep; it just has a size to check.
    if (layout.code !== "not-shown") return layout;
    const size = sizeOf(bytes, parsed.heif, parsed.heif.primary);
    if (!size || size.width <= 0 || size.height <= 0) return { ok: false, code: "damaged" };
    return { ok: true, width: size.width, height: size.height };
  }
  return { ok: true, width: layout.layout.width, height: layout.layout.height };
}

/** A step applied to the decoded picture, in the order the file lists them. */
export type Transform =
  | { kind: "crop"; x: number; y: number; width: number; height: number }
  /** Quarter turns anticlockwise (1, 2 or 3). */
  | { kind: "rotate"; quarterTurns: number }
  /** "vertical": top and bottom swap; "horizontal": left and right swap (libheif's reading of `imir`). */
  | { kind: "mirror"; flip: "vertical" | "horizontal" };

/** Everything the viewer's worker needs to decode and draw the picture, all checked. */
export interface HeicPlan {
  config: HevcConfig;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  /** The decoded picture's size, before the transforms. */
  width: number;
  height: number;
  /** Each tile's coded data, in grid order (left to right, top to bottom). */
  tiles: Uint8Array[];
  transforms: Transform[];
  /** The size after the transforms: what is shown. */
  shownWidth: number;
  shownHeight: number;
}

export type PlanResult = { ok: true; plan: HeicPlan } | { ok: false; code: HeicRefusal };

/** Properties a primary picture may carry: understood, or harmless to leave out when drawing. */
const PRIMARY_PROPERTIES = new Set(["ispe", "hvcC", "irot", "imir", "clap", "colr", "pixi", "pasp"]);
/** Properties a tile may carry. A crop, rotation or mirror on a tile is not allowed by the format. */
const TILE_PROPERTIES = new Set(["ispe", "hvcC", "colr", "pixi", "pasp"]);

/** Refuses an unknown property the file marks as essential (a reader that ignores it would draw it wrong). */
const unknownEssential = (list: Association[], known: Set<string>) => list.some((a) => a.essential && !known.has(a.property.type));

/** The crop (`clap`) as a rectangle in a `width` × `height` picture, or null when it doesn't fit inside. */
function readClap(bytes: Uint8Array, a: Association, width: number, height: number): Transform | null {
  const r = propertyReader(bytes, a.property);
  const widthN = r.u32();
  const widthD = r.u32();
  const heightN = r.u32();
  const heightD = r.u32();
  // The offsets are signed.
  const horizN = r.u32() | 0;
  const horizD = r.u32();
  const vertN = r.u32() | 0;
  const vertD = r.u32();
  if (widthD === 0 || heightD === 0 || horizD === 0 || vertD === 0) return null;
  const clapW = widthN / widthD;
  const clapH = heightN / heightD;
  // The crop's centre is the picture's centre moved by the offsets; libheif rounds the same way.
  const left = Math.floor(horizN / horizD + (width - 1) / 2 - (clapW - 1) / 2);
  const top = Math.floor(vertN / vertD + (height - 1) / 2 - (clapH - 1) / 2);
  const w = Math.round(clapW);
  const h = Math.round(clapH);
  if (!(w >= 1 && h >= 1 && left >= 0 && top >= 0 && left + w <= width && top + h <= height)) return null;
  return { kind: "crop", x: left, y: top, width: w, height: h };
}

/**
 * The checked plan for drawing a HEIC, or why it won't be drawn. Every condition in this file's
 * header is checked here, before the worker hands a single byte to the decoder.
 */
export function heicPicture(bytes: Uint8Array): PlanResult {
  try {
    const header = heicHeader(bytes);
    if (!header.ok) return header;
    const parsed = parseHeif(bytes);
    if (!parsed.ok) return { ok: false, code: "damaged" };
    const heif = parsed.heif;
    const found = layoutOf(bytes, heif);
    if (!found.ok) return found;
    const layout = found.layout;

    const primary = heif.items.get(layout.primary)!;
    if (primary.protection !== 0) return { ok: false, code: "not-shown" };
    const primaryProps = heif.associations.get(layout.primary) ?? [];
    if (unknownEssential(primaryProps, PRIMARY_PROPERTIES)) return { ok: false, code: "not-shown" };

    // The tiles (a single picture is its own one tile): one shared configuration, one tile size.
    // A fresh budget the size of the file: layoutOf already proved the tiles fit in it.
    const budget = ByteBudget.forFile(bytes, MAX_RECEIPT_BYTES);
    let record: Uint8Array | null = null;
    let tileSize: { width: number; height: number } | null = null;
    const tiles: Uint8Array[] = [];
    for (const id of layout.tiles) {
      const item = heif.items.get(id)!;
      if (item.protection !== 0) return { ok: false, code: "not-shown" };
      const props = heif.associations.get(id) ?? [];
      if (id !== layout.primary && (unknownEssential(props, TILE_PROPERTIES) || props.some((a) => ["irot", "imir", "clap"].includes(a.property.type)))) {
        return { ok: false, code: "not-shown" };
      }
      const hvcc = propertiesOf(heif, id, "hvcC");
      const size = sizeOf(bytes, heif, id);
      if (hvcc.length !== 1 || !size) return { ok: false, code: "damaged" };
      const own = bytes.subarray(hvcc[0].property.content, hvcc[0].property.end);
      if (record === null) record = own;
      else if (!sameBytes(record, own)) return { ok: false, code: "not-shown" };
      if (tileSize === null) tileSize = size;
      else if (size.width !== tileSize.width || size.height !== tileSize.height) return { ok: false, code: "damaged" };
      const data = itemData(bytes, heif, id, budget);
      if (!data) return { ok: false, code: "damaged" };
      tiles.push(data);
    }
    const tw = tileSize!.width;
    const th = tileSize!.height;
    const columns = layout.grid?.columns ?? 1;
    const rows = layout.grid?.rows ?? 1;
    // The tiles cover the picture, and no tile lies wholly outside it ("no more tiles than the size needs").
    if (columns * tw < layout.width || rows * th < layout.height) return { ok: false, code: "damaged" };
    if ((columns - 1) * tw >= layout.width || (rows - 1) * th >= layout.height) return { ok: false, code: "damaged" };
    if (!layout.grid && (tw !== layout.width || th !== layout.height)) return { ok: false, code: "damaged" };

    const hevc = readHvcc(record!);
    if (!hevc.ok) return hevc;
    // The caps hold for what the decoder is actually asked for: the coded size in the SPS (which a
    // file could set far above its declared tile size), each tile on its own and all tiles together.
    const coded = hevc.config;
    if (overCaps(coded.codedWidth, coded.codedHeight) || layout.tiles.length * coded.codedWidth * coded.codedHeight > MAX_DECODED_PIXELS) {
      return { ok: false, code: "too-many-pixels" };
    }
    // What the decoder will make of each tile must be the tile size the file declares.
    if (hevc.config.width !== tw || hevc.config.height !== th) return { ok: false, code: "damaged" };
    for (const data of tiles) {
      const check = checkTileData(data, hevc.config.lengthSize);
      if (check !== "ok") return { ok: false, code: check };
    }

    // The transforms, in the order the primary's property list gives them; one of each at most.
    const transforms: Transform[] = [];
    let w = layout.width;
    let h = layout.height;
    const seen = new Set<string>();
    for (const a of primaryProps) {
      const type = a.property.type;
      if (type !== "clap" && type !== "irot" && type !== "imir") continue;
      if (seen.has(type)) return { ok: false, code: "damaged" };
      seen.add(type);
      if (type === "clap") {
        const crop = readClap(bytes, a, w, h);
        if (!crop || crop.kind !== "crop") return { ok: false, code: "damaged" };
        transforms.push(crop);
        w = crop.width;
        h = crop.height;
      } else if (type === "irot") {
        const turns = propertyReader(bytes, a.property).u8() & 3;
        if (turns !== 0) transforms.push({ kind: "rotate", quarterTurns: turns });
        if (turns % 2 === 1) [w, h] = [h, w];
      } else {
        const axis = propertyReader(bytes, a.property).u8() & 1;
        transforms.push({ kind: "mirror", flip: axis === 0 ? "vertical" : "horizontal" });
      }
    }

    return {
      ok: true,
      plan: {
        config: hevc.config,
        tileWidth: tw,
        tileHeight: th,
        columns,
        rows,
        width: layout.width,
        height: layout.height,
        tiles,
        transforms,
        shownWidth: w,
        shownHeight: h,
      },
    };
  } catch {
    return { ok: false, code: "damaged" };
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
