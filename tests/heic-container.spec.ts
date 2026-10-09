/**
 * [8i] DotAmi's own HEIC container reader (lib/expenses/receipts/heic/), against invented and hostile
 * files. Option D of docs/connectors/heic-decoder-review.md: the reader decides, before a single byte
 * reaches the browser's video decoder (and the graphics chip), that the file is one still picture of
 * a kind DotAmi draws, inside the pixel caps, with its data inside the file. Hostile files: truncated,
 * lying about sizes, wrong brands, too many items, deep nesting, loops, boxes and data pointing
 * outside the file, and a few thousand random corruptions. The reader must refuse, never throw, never
 * hang. Every file here is built in code (tests/helpers/heic-files.ts); the HEVC inside is four tiny
 * flat-colour pictures.
 */
import { describe, expect, it } from "vitest";

import { parseHeif } from "@/lib/expenses/receipts/heic/container";
import { checkTileData, readHvcc } from "@/lib/expenses/receipts/heic/hevc";
import { MAX_BOXES, MAX_ITEMS, MAX_TILES } from "@/lib/expenses/receipts/heic/limits";
import { heicBrands, heicHeader, heicPicture } from "@/lib/expenses/receipts/heic/picture";
import { sniffReceipt } from "@/lib/expenses/receipts/sniff";
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE } from "@/lib/expenses/receipts/types";
import { box, ftyp, fullBox, heic, INVENTED_HVCC, INVENTED_TILES, TILE } from "./helpers/heic-files";
import { jpegHeader } from "./helpers/receipt-files";

const bytes = (b: Buffer) => new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

/** The plan, or the test fails with the refusal code. */
function plan(file: Buffer) {
  const result = heicPicture(bytes(file));
  if (!result.ok) throw new Error(`refused: ${result.code}`);
  return result.plan;
}

describe("accepting a HEIC photo", () => {
  it("reads an iPhone-shaped grid: four 128 × 128 tiles into one 256 × 256 picture", () => {
    const file = heic();
    expect(sniffReceipt(bytes(file))).toEqual({ ok: true, type: "image/heic", width: 256, height: 256 });
    const p = plan(file);
    expect(p).toMatchObject({ tileWidth: TILE, tileHeight: TILE, columns: 2, rows: 2, width: 256, height: 256, shownWidth: 256, shownHeight: 256, transforms: [] });
    expect(p.tiles.map((t) => Buffer.from(t).toString("hex"))).toEqual(INVENTED_TILES.map((t) => t.toString("hex")));
    // The codec string WebCodecs is asked about comes from the record itself (Main, level 6.2, as the encoder wrote it).
    expect(p.config.codec).toBe("hvc1.1.2.L186.90");
    expect(Buffer.from(p.config.record).equals(INVENTED_HVCC)).toBe(true);
    expect(p.config).toMatchObject({ profile: 1, lengthSize: 4, codedWidth: TILE, codedHeight: TILE, width: TILE, height: TILE });
  });

  it("reads a single coded picture as the primary item", () => {
    const p = plan(heic({ layout: "single", single: 2 }));
    expect(p).toMatchObject({ columns: 1, rows: 1, width: TILE, height: TILE });
    expect(Buffer.from(p.tiles[0]).equals(INVENTED_TILES[2])).toBe(true);
  });

  it("hands the decoder the primary picture only: never the thumbnail, the gain map or the Exif block", () => {
    const file = heic({ extras: true });
    expect(sniffReceipt(bytes(file))).toMatchObject({ ok: true, type: "image/heic" });
    const p = plan(file);
    expect(p.tiles).toHaveLength(4);
    // The thumbnail is tile 3's bytes and the gain map tile 2's, stored again after the grid's tiles:
    // every tile handed over starts where the grid's own tiles are, before any of the extras.
    const gridEnd = file.indexOf(INVENTED_TILES[3]) + INVENTED_TILES[3].length;
    for (const t of p.tiles) expect(t.byteOffset + t.length).toBeLessThanOrEqual(gridEnd);
  });

  it("accepts the brands the review's corrected rule names, and only them", () => {
    expect(heicBrands(bytes(heic({ major: "heic", compatible: ["mif1", "heic"] })))).toBe("heic");
    expect(heicBrands(bytes(heic({ major: "heix", compatible: ["mif1", "heix"] })))).toBe("heic");
    expect(heicBrands(bytes(heic({ major: "mif1", compatible: ["heic"] })))).toBe("heic");
    // mif1 alone is the general image brand: an AVIF says it too.
    expect(heicBrands(bytes(heic({ major: "mif1", compatible: ["avif", "miaf"] })))).toBe("not-heic");
    expect(sniffReceipt(bytes(heic({ major: "mif1", compatible: ["avif"] })))).toEqual({ ok: false, code: "other-picture" });
    expect(sniffReceipt(bytes(heic({ major: "avif", compatible: ["mif1", "avif"] })))).toEqual({ ok: false, code: "other-picture" });
  });

  it("refuses image sequences, bursts and layered pictures, by major or compatible brand", () => {
    for (const [major, compatible] of [
      ["msf1", ["heic"]],
      ["heic", ["mif1", "msf1", "heic"]],
      ["hevc", ["msf1"]],
      ["hevs", []],
      ["heis", ["mif1"]],
    ] as [string, string[]][]) {
      expect(sniffReceipt(bytes(heic({ major, compatible }))), `${major} + ${compatible.join(",")}`).toEqual({ ok: false, code: "heif-sequence" });
    }
  });
});

describe("hostile and broken files", () => {
  it("calls a HEIC brand followed by a JPEG, or by nothing, damaged", () => {
    const brand = ftyp("heic", ["mif1", "heic"]);
    expect(sniffReceipt(bytes(Buffer.concat([brand, jpegHeader(100, 100)])))).toEqual({ ok: false, code: "damaged" });
    expect(sniffReceipt(bytes(brand))).toEqual({ ok: false, code: "damaged" });
    expect(sniffReceipt(bytes(Buffer.concat([brand, box("mdat", INVENTED_TILES[0])])))).toEqual({ ok: false, code: "damaged" });
  });

  it("refuses every truncation of a file, from the item table to the last byte of picture data", () => {
    const file = heic();
    for (let length = 0; length < file.length; length += 1) {
      const cut = bytes(file.subarray(0, length));
      const sniffed = sniffReceipt(cut);
      expect(sniffed.ok, `cut at ${length}`).toBe(false);
      expect(heicPicture(cut).ok, `cut at ${length}`).toBe(false);
    }
    expect(sniffReceipt(bytes(file)).ok).toBe(true);
  });

  it("refuses a picture that claims more pixels than the caps, before anything else is read", () => {
    const bomb = heic({ primarySize: { width: 30_000, height: 30_000 } });
    expect(bomb.length).toBeLessThan(2_000);
    expect(sniffReceipt(bytes(bomb))).toEqual({ ok: false, code: "too-many-pixels" });
    expect(heicPicture(bytes(bomb))).toEqual({ ok: false, code: "too-many-pixels" });
    expect(sniffReceipt(bytes(heic({ primarySize: { width: MAX_IMAGE_SIDE + 1, height: 1 } })))).toEqual({ ok: false, code: "too-many-pixels" });
    const side = Math.floor(Math.sqrt(MAX_IMAGE_PIXELS)) + 1;
    expect(sniffReceipt(bytes(heic({ primarySize: { width: side, height: side } })))).toEqual({ ok: false, code: "too-many-pixels" });
  });

  it("refuses a box that claims to be larger than the file, or than the box around it", () => {
    const file = heic();
    const meta = file.indexOf("meta") - 4;
    const huge = Buffer.from(file);
    huge.writeUInt32BE(file.length * 4, meta);
    expect(sniffReceipt(bytes(huge))).toEqual({ ok: false, code: "damaged" });
    // A 64-bit size: 1 in the size field, then a size of about 2^52.
    const large = Buffer.concat([file.subarray(0, meta), Buffer.from([0, 0, 0, 1]), Buffer.from("meta", "latin1"), Buffer.from([0, 0x0f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), file.subarray(meta + 8)]);
    expect(sniffReceipt(bytes(large))).toEqual({ ok: false, code: "damaged" });
    // The property list (ipco) claiming more than its parent (iprp) holds.
    const ipco = file.indexOf("ipco") - 4;
    const child = Buffer.from(file);
    child.writeUInt32BE(file.readUInt32BE(ipco) + 64, ipco);
    expect(sniffReceipt(bytes(child))).toEqual({ ok: false, code: "damaged" });
    // A box of size 4: smaller than its own header, so the reader could never move past it.
    const tiny = Buffer.from(file);
    tiny.writeUInt32BE(4, file.indexOf("iinf") - 4);
    expect(sniffReceipt(bytes(tiny))).toEqual({ ok: false, code: "damaged" });
  });

  it("refuses picture data that points outside the file, or wraps around", () => {
    const file = heic({ layout: "single" });
    // The iloc entry: id 1, method 0, data reference 0, one extent, then its offset and length.
    const iloc = file.indexOf("iloc");
    const entry = iloc + 4 + 4 + 2 + 2; // the box type, version/flags, field sizes, item count
    const past = Buffer.from(file);
    past.writeUInt32BE(file.length + 10, entry + 8);
    expect(sniffReceipt(bytes(past))).toEqual({ ok: false, code: "damaged" });
    const wraps = Buffer.from(file);
    wraps.writeUInt32BE(0xffffffff, entry + 12);
    expect(sniffReceipt(bytes(wraps))).toEqual({ ok: false, code: "damaged" });
    // Data said to be in another file is never followed.
    expect(sniffReceipt(bytes(heic({ layout: "single", dataInAnotherFile: true })))).toEqual({ ok: false, code: "damaged" });
    expect(sniffReceipt(bytes(heic({ dataInAnotherFile: true })))).toEqual({ ok: false, code: "damaged" });
  });

  it("refuses a file with more items than any photo has", () => {
    const many = Array.from({ length: MAX_ITEMS + 1 }, (_, i) =>
      fullBox("infe", 2, 0, Buffer.from([(i + 1) >> 8, (i + 1) & 0xff]), Buffer.alloc(2), Buffer.from("Exif\0", "latin1")),
    );
    const meta = fullBox(
      "meta",
      0,
      0,
      fullBox("hdlr", 0, 0, Buffer.alloc(4), Buffer.from("pict", "latin1"), Buffer.alloc(13)),
      fullBox("pitm", 0, 0, Buffer.from([0, 1])),
      fullBox("iinf", 0, 0, Buffer.from([0xff, 0xff]), ...many),
      fullBox("iloc", 1, 0, Buffer.from([0x44, 0, 0, 0])),
      box("iprp", box("ipco"), fullBox("ipma", 0, 0, Buffer.alloc(4))),
    );
    const file = Buffer.concat([ftyp("heic", ["mif1", "heic"]), meta]);
    expect(parseHeif(bytes(file)).ok).toBe(false);
    expect(sniffReceipt(bytes(file))).toEqual({ ok: false, code: "damaged" });
  });

  it("stops at the box budget, and isn't troubled by boxes nested thousands deep", () => {
    const file = heic();
    const meta = file.indexOf("meta") - 4;
    // Thousands of empty boxes inside meta: over the budget.
    const flood = Buffer.concat(Array.from({ length: MAX_BOXES + 1 }, () => box("free")));
    const flooded = Buffer.concat([file.subarray(0, meta), box("free", flood), file.subarray(meta)]);
    // At the top level, so the reader walks every one of them.
    const topFlood = Buffer.concat([file.subarray(0, meta), flood, file.subarray(meta)]);
    expect(sniffReceipt(bytes(topFlood))).toEqual({ ok: false, code: "damaged" });
    // Nested inside one unknown box: never opened, so harmless (and the iloc offsets still hold once fixed up).
    expect(parseHeif(bytes(flooded)).ok).toBe(true);
    // 20,000 levels of nesting in a box DotAmi doesn't open: no recursion, no stack to overflow.
    // Written header by header into one buffer (building it box by box would copy it 20,000 times).
    const levels = 20_000;
    const deep = Buffer.alloc(8 * levels);
    for (let i = 0; i < levels; i += 1) {
      deep.writeUInt32BE(8 * (levels - i), 8 * i);
      deep.write("skip", 8 * i + 4, "latin1");
    }
    const nested = Buffer.concat([file.subarray(0, meta), deep, file.subarray(meta)]);
    expect(() => parseHeif(bytes(nested))).not.toThrow();
    expect(parseHeif(bytes(nested)).ok).toBe(true);
  });

  it("refuses references that loop or lead nowhere: a grid made of itself, of another grid, of missing items", () => {
    // The grid listing itself as a tile: kept (it is a HEIC, and nothing decodes it), never drawn.
    const self = heic({ dimg: [1, 3, 4, 5] });
    expect(heicPicture(bytes(self))).toEqual({ ok: false, code: "not-shown" });
    // Tiles that are themselves grids.
    expect(heicPicture(bytes(heic({ tileType: "grid" })))).toEqual({ ok: false, code: "not-shown" });
    // A tile id no item has.
    expect(heicPicture(bytes(heic({ dimg: [2, 3, 4, 99] })))).toEqual({ ok: false, code: "damaged" });
    // Fewer tiles than the grid's rows × columns.
    expect(heicPicture(bytes(heic({ dimg: [2, 3, 4] })))).toEqual({ ok: false, code: "damaged" });
  });

  it("refuses more tiles than the picture's size needs, and tiles of another size than declared", () => {
    // 2 × 2 tiles of 128 for a 128-wide picture: the right column lies wholly outside it.
    expect(heicPicture(bytes(heic({ grid: { rows: 2, columns: 2, width: 128, height: 256, tiles: [0, 1, 2, 3] } })))).toEqual({ ok: false, code: "damaged" });
    // Tiles too few to cover the picture.
    expect(heicPicture(bytes(heic({ grid: { rows: 2, columns: 2, width: 300, height: 256, tiles: [0, 1, 2, 3] } })))).toEqual({ ok: false, code: "damaged" });
    // Tiles declared 64 × 64 whose coded pictures are 128 × 128.
    expect(heicPicture(bytes(heic({ tileSize: { width: 64, height: 64 }, grid: { rows: 2, columns: 2, width: 128, height: 128, tiles: [0, 1, 2, 3] } })))).toEqual({
      ok: false,
      code: "damaged",
    });
    // Partial tiles at the edges are fine: 2 × 2 tiles of 128 for a 200 × 220 picture.
    expect(plan(heic({ grid: { rows: 2, columns: 2, width: 200, height: 220, tiles: [0, 1, 2, 3] } }))).toMatchObject({ width: 200, height: 220 });
    expect(MAX_TILES).toBeGreaterThanOrEqual(192); // a 48-megapixel iPhone photo
  });

  it("refuses an unknown property marked essential, and keeps the file", () => {
    const file = heic({ unknownEssential: true });
    expect(sniffReceipt(bytes(file))).toMatchObject({ ok: true, type: "image/heic" });
    expect(heicPicture(bytes(file))).toEqual({ ok: false, code: "not-shown" });
  });
});

describe("the HEVC checks before anything reaches the decoder", () => {
  /** The invented record with its parameter-set lists rebuilt: each [type, nal][] list in order. */
  const arraysOf = (record: Buffer) => {
    const out: [number, Buffer[]][] = [];
    let at = 23;
    for (let a = 0; a < record[22]; a += 1) {
      const type = record[at] & 0x3f;
      const n = record.readUInt16BE(at + 1);
      at += 3;
      const nals: Buffer[] = [];
      for (let i = 0; i < n; i += 1) {
        const length = record.readUInt16BE(at);
        nals.push(record.subarray(at + 2, at + 2 + length));
        at += 2 + length;
      }
      out.push([type, nals]);
    }
    return out;
  };
  const recordWith = (arrays: [number, Buffer[]][]) =>
    Buffer.concat([
      INVENTED_HVCC.subarray(0, 22),
      Buffer.from([arrays.length]),
      ...arrays.map(([type, nals]) =>
        Buffer.concat([Buffer.from([0x80 | type, nals.length >> 8, nals.length & 0xff]), ...nals.map((n) => Buffer.concat([Buffer.from([n.length >> 8, n.length & 0xff]), n]))]),
      ),
    ]);
  const sps = arraysOf(INVENTED_HVCC).find(([t]) => t === 33)![1][0];

  it("accepts the invented record and rebuilds it byte for byte", () => {
    expect(recordWith(arraysOf(INVENTED_HVCC)).equals(INVENTED_HVCC)).toBe(true);
    expect(readHvcc(bytes(INVENTED_HVCC))).toMatchObject({ ok: true, config: { codec: "hvc1.1.2.L186.90", width: 128, height: 128 } });
  });

  it("refuses 10-bit, other profiles and other chroma formats, and keeps the file", () => {
    const tenBit = Buffer.from(INVENTED_HVCC);
    tenBit[17] = 0xfa; // bitDepthLumaMinus8 = 2
    const main10 = Buffer.from(INVENTED_HVCC);
    main10[1] = 0x02;
    const chroma444 = Buffer.from(INVENTED_HVCC);
    chroma444[16] = 0xff;
    for (const record of [tenBit, main10, chroma444]) {
      expect(readHvcc(bytes(record))).toEqual({ ok: false, code: "not-shown" });
      const file = heic({ hvcc: record });
      expect(sniffReceipt(bytes(file))).toMatchObject({ ok: true, type: "image/heic" });
      expect(heicPicture(bytes(file))).toEqual({ ok: false, code: "not-shown" });
    }
  });

  it("refuses a record whose SPS says something else than the record", () => {
    // The record says Main Still Picture (3); its SPS says Main (1).
    const disagree = Buffer.from(INVENTED_HVCC);
    disagree[1] = 0x03;
    expect(readHvcc(bytes(disagree))).toEqual({ ok: false, code: "not-shown" });
  });

  it("wants exactly one VPS, SPS and PPS", () => {
    const arrays = arraysOf(INVENTED_HVCC);
    const twoSps = arrays.map(([t, n]) => [t, t === 33 ? [n[0], n[0]] : n] as [number, Buffer[]]);
    expect(readHvcc(bytes(recordWith(twoSps)))).toEqual({ ok: false, code: "not-shown" });
    const noPps = arrays.filter(([t]) => t !== 34);
    expect(readHvcc(bytes(recordWith(noPps)))).toEqual({ ok: false, code: "not-shown" });
    // A list whose type says SPS but whose unit is a PPS.
    const mislabelled = arrays.map(([t, n]) => [t, t === 33 ? arrays.find(([x]) => x === 34)![1] : n] as [number, Buffer[]]);
    expect(readHvcc(bytes(recordWith(mislabelled)))).toEqual({ ok: false, code: "damaged" });
    // Bytes after the last list.
    expect(readHvcc(bytes(Buffer.concat([INVENTED_HVCC, Buffer.from([0])])))).toEqual({ ok: false, code: "damaged" });
    // Cut short.
    for (let n = 0; n < INVENTED_HVCC.length; n += 7) expect(readHvcc(bytes(INVENTED_HVCC.subarray(0, n))).ok).toBe(false);
  });

  it("checks each tile: key pictures only, no parameter sets of its own, no second layer, lengths inside", () => {
    const tile = INVENTED_TILES[0];
    expect(checkTileData(bytes(tile), 4)).toBe("ok");
    const slice = tile.indexOf(Buffer.from([0x26, 0x01])); // the IDR slice's header
    const trailing = Buffer.from(tile);
    trailing[slice] = 0x02; // TRAIL_R: a picture that depends on another
    expect(checkTileData(bytes(trailing), 4)).toBe("not-shown");
    const layered = Buffer.from(tile);
    layered[slice + 1] = 0x09; // nuh_layer_id 1
    expect(checkTileData(bytes(layered), 4)).toBe("not-shown");
    const withSps = Buffer.concat([Buffer.from([0, 0, 0, sps.length]), sps, tile]);
    expect(checkTileData(bytes(withSps), 4)).toBe("not-shown");
    expect(heicPicture(bytes(heic({ tileData: (i, d) => (i === 2 ? withSps : d) })))).toEqual({ ok: false, code: "not-shown" });
    const tooLong = Buffer.from(tile);
    tooLong.writeUInt32BE(10_000, 0);
    expect(checkTileData(bytes(tooLong), 4)).toBe("damaged");
    expect(checkTileData(bytes(tile.subarray(0, 30)), 4)).toBe("damaged"); // the SEI alone: no picture
    expect(heicPicture(bytes(heic({ tileData: (i, d) => (i === 1 ? tooLong : d) })))).toEqual({ ok: false, code: "damaged" });
  });
});

describe("crop, rotation and mirroring", () => {
  it("reads them in the order the file lists them, and sizes the shown picture to match", () => {
    const wide = { rows: 1, columns: 2, width: 256, height: 128, tiles: [0, 1] };
    expect(plan(heic({ grid: wide, transforms: [["irot", 1]] }))).toMatchObject({ transforms: [{ kind: "rotate", quarterTurns: 1 }], shownWidth: 128, shownHeight: 256 });
    expect(plan(heic({ grid: wide, transforms: [["imir", 0]] })).transforms).toEqual([{ kind: "mirror", flip: "vertical" }]);
    expect(plan(heic({ grid: wide, transforms: [["imir", 1]] })).transforms).toEqual([{ kind: "mirror", flip: "horizontal" }]);
    // A centred 200 × 100 crop of the 256 × 128 picture, then a quarter turn.
    const cropped = plan(heic({ grid: wide, transforms: [["clap", [200, 1, 100, 1, 0, 1, 0, 1]], ["irot", 3]] }));
    expect(cropped.transforms).toEqual([
      { kind: "crop", x: 28, y: 14, width: 200, height: 100 },
      { kind: "rotate", quarterTurns: 3 },
    ]);
    expect(cropped).toMatchObject({ shownWidth: 100, shownHeight: 200 });
    // A turn of 0 is no transform at all.
    expect(plan(heic({ transforms: [["irot", 0]] })).transforms).toEqual([]);
  });

  it("refuses a crop outside the picture, a zero denominator, and the same transform twice", () => {
    expect(heicPicture(bytes(heic({ transforms: [["clap", [300, 1, 100, 1, 0, 1, 0, 1]]] })))).toEqual({ ok: false, code: "damaged" });
    expect(heicPicture(bytes(heic({ transforms: [["clap", [100, 1, 100, 1, 200, 1, 0, 1]]] })))).toEqual({ ok: false, code: "damaged" });
    expect(heicPicture(bytes(heic({ transforms: [["clap", [100, 0, 100, 1, 0, 1, 0, 1]]] })))).toEqual({ ok: false, code: "damaged" });
    expect(heicPicture(bytes(heic({ transforms: [["irot", 1], ["irot", 1]] })))).toEqual({ ok: false, code: "damaged" });
  });
});

describe("random corruption (a property test)", () => {
  /** A small seeded generator, so a failure can be replayed. */
  function random(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("never throws, and whatever it accepts stays inside the file and the caps", () => {
    const originals = [heic(), heic({ extras: true }), heic({ layout: "single", transforms: [["irot", 1], ["clap", [100, 1, 90, 1, 0, 1, 0, 1]]] })];
    const next = random(20261009);
    let accepted = 0;
    for (let round = 0; round < 3000; round += 1) {
      const original = originals[round % originals.length];
      const file = Buffer.from(original);
      const changes = 1 + Math.floor(next() * 8);
      for (let c = 0; c < changes; c += 1) {
        const at = Math.floor(next() * file.length);
        // Mostly small nudges to sizes and counts, sometimes any byte at all.
        file[at] = next() < 0.5 ? (file[at] + (next() < 0.5 ? 1 : 255)) & 0xff : Math.floor(next() * 256);
      }
      const cut = next() < 0.2 ? file.subarray(0, Math.floor(next() * file.length)) : file;
      const view = bytes(cut);
      let result!: ReturnType<typeof heicPicture>;
      expect(() => sniffReceipt(view), `round ${round}`).not.toThrow();
      expect(() => (result = heicPicture(view)), `round ${round}`).not.toThrow();
      if (!result.ok) continue;
      accepted += 1;
      const p = result.plan;
      expect(p.tiles.length).toBe(p.rows * p.columns);
      expect(p.tiles.length).toBeLessThanOrEqual(MAX_TILES);
      expect(p.shownWidth * p.shownHeight).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
      expect(Math.max(p.width, p.height, p.shownWidth, p.shownHeight)).toBeLessThanOrEqual(MAX_IMAGE_SIDE);
      for (const t of p.tiles) {
        expect(t.length).toBeGreaterThan(0);
        expect(checkTileData(t, p.config.lengthSize)).toBe("ok");
      }
    }
    // Some corruptions land on bytes that don't matter (a tile's slice data, a name): the test saw both answers.
    expect(accepted).toBeGreaterThan(0);
    expect(accepted).toBeLessThan(3000);
  });

  it("never throws on random bytes behind a HEIC brand", () => {
    const next = random(7);
    const brand = ftyp("heic", ["mif1", "heic"]);
    for (let round = 0; round < 2000; round += 1) {
      const noise = Buffer.from(Array.from({ length: Math.floor(next() * 400) }, () => Math.floor(next() * 256)));
      const view = bytes(Buffer.concat([brand, noise]));
      expect(() => sniffReceipt(view)).not.toThrow();
      expect(heicPicture(view).ok).toBe(false);
    }
    expect(heicHeader(bytes(brand))).toEqual({ ok: false, code: "damaged" });
  });
});
