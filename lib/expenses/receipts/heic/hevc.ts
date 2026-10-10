/**
 * [8i] The HEVC parts of a HEIC photo that DotAmi checks itself BEFORE any byte reaches the browser's
 * video decoder (and through it the graphics chip): the decoder configuration record (`hvcC`), the
 * sequence parameter set inside it, and the shape of each tile's coded data. Conditions of the
 * maintainer's choice of option D (docs/connectors/heic-decoder-review.md § What was chosen):
 * HEVC Main or Main Still Picture only, 8-bit 4:2:0, exactly one VPS, SPS and PPS, and every tile
 * one key picture. This decodes nothing: it reads headers, the same way sniff.ts reads a JPEG's.
 */

import { MAX_HVCC_ARRAYS, SHOWN_PROFILES } from "./limits";

/** NAL unit types (ITU-T H.265 Table 7-1) this file names. */
const VPS = 32;
const SPS = 33;
const PPS = 34;
const AUD = 35;
const PREFIX_SEI = 39;
const SUFFIX_SEI = 40;
/** Key pictures: BLA, IDR and CRA (16 to 21). Anything below 16 depends on another picture. */
const isKeyPicture = (type: number) => type >= 16 && type <= 21;

export interface HevcConfig {
  /** The `hvcC` record itself: WebCodecs takes it as the decoder's `description`. */
  record: Uint8Array;
  /** The codec string WebCodecs asks for, e.g. "hvc1.1.6.L93.B0" (ISO/IEC 14496-15 Annex E). */
  codec: string;
  profile: number;
  /** Bytes in front of each NAL unit in the tiles' data: 1, 2 or 4. */
  lengthSize: number;
  /** The coded size and the size after the conformance window's crop, from the SPS. */
  codedWidth: number;
  codedHeight: number;
  width: number;
  height: number;
}

export type HevcRefusal = "damaged" | "not-shown";
export type HevcResult = { ok: true; config: HevcConfig } | { ok: false; code: HevcRefusal };

/** Big-endian bit reader over an RBSP (emulation-prevention bytes already removed). */
class Bits {
  private bit = 0;
  constructor(private readonly bytes: Uint8Array) {}
  u(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i += 1) {
      const byte = this.bit >> 3;
      if (byte >= this.bytes.length) throw new Error("short");
      v = v * 2 + ((this.bytes[byte] >> (7 - (this.bit & 7))) & 1);
      this.bit += 1;
    }
    return v;
  }
  /** Exp-Golomb ue(v); more than 31 leading zeros can't be a real value. */
  ue(): number {
    let zeros = 0;
    while (this.u(1) === 0) {
      zeros += 1;
      if (zeros > 31) throw new Error("ue too long");
    }
    return 2 ** zeros - 1 + this.u(zeros);
  }
}

/** A NAL unit's payload without its emulation-prevention bytes (00 00 03 → 00 00). */
function rbsp(nal: Uint8Array): Uint8Array {
  const out = new Uint8Array(nal.length);
  let n = 0;
  let zeros = 0;
  for (const b of nal) {
    if (zeros >= 2 && b === 3) {
      zeros = 0;
      continue;
    }
    out[n++] = b;
    zeros = b === 0 ? zeros + 1 : 0;
  }
  return out.subarray(0, n);
}

/** The NAL unit's type from its two-byte header; -1 for a header DotAmi won't accept (forbidden bit, another layer). */
function nalType(nal: Uint8Array): number {
  if (nal.length < 2) return -1;
  const forbidden = nal[0] >> 7;
  const layer = ((nal[0] & 1) << 5) | (nal[1] >> 3);
  // A picture in a second layer belongs to a layered (scalable or multi-view) stream, which DotAmi doesn't draw.
  if (forbidden !== 0 || layer !== 0) return -1;
  return (nal[0] >> 1) & 0x3f;
}

interface Sps {
  profileSpace: number;
  profile: number;
  chroma: number;
  bitDepthLuma: number;
  bitDepthChroma: number;
  codedWidth: number;
  codedHeight: number;
  width: number;
  height: number;
}

/** The SPS fields up to the bit depths (H.265 7.3.2.2.1). Throws on a short or odd one. */
function readSps(nal: Uint8Array): Sps {
  const b = new Bits(rbsp(nal.subarray(2)));
  b.u(4); // sps_video_parameter_set_id
  const maxSubLayersMinus1 = b.u(3);
  b.u(1); // temporal id nesting
  // profile_tier_level(1, maxSubLayersMinus1)
  const profileSpace = b.u(2);
  b.u(1); // tier
  const profile = b.u(5);
  b.u(32); // compatibility flags
  b.u(48); // progressive, interlaced, non-packed, frame-only and the 44 constraint bits
  b.u(8); // level
  const subProfile: number[] = [];
  const subLevel: number[] = [];
  for (let i = 0; i < maxSubLayersMinus1; i += 1) {
    subProfile.push(b.u(1));
    subLevel.push(b.u(1));
  }
  if (maxSubLayersMinus1 > 0) for (let i = maxSubLayersMinus1; i < 8; i += 1) b.u(2);
  for (let i = 0; i < maxSubLayersMinus1; i += 1) {
    if (subProfile[i]) b.u(88);
    if (subLevel[i]) b.u(8);
  }
  b.ue(); // sps_seq_parameter_set_id
  const chroma = b.ue();
  if (chroma === 3) b.u(1); // separate colour planes
  const codedWidth = b.ue();
  const codedHeight = b.ue();
  let width = codedWidth;
  let height = codedHeight;
  if (b.u(1)) {
    // The conformance window, in chroma samples: 2 luma samples each way for 4:2:0.
    const unitX = chroma === 1 || chroma === 2 ? 2 : 1;
    const unitY = chroma === 1 ? 2 : 1;
    const left = b.ue();
    const right = b.ue();
    const top = b.ue();
    const bottom = b.ue();
    width = codedWidth - unitX * (left + right);
    height = codedHeight - unitY * (top + bottom);
  }
  const bitDepthLuma = b.ue() + 8;
  const bitDepthChroma = b.ue() + 8;
  return { profileSpace, profile, chroma, bitDepthLuma, bitDepthChroma, codedWidth, codedHeight, width, height };
}

/** Reverses the 32 bits of the profile compatibility flags, as the codec string writes them. */
function reverse32(v: number): number {
  let out = 0;
  for (let i = 0; i < 32; i += 1) out = out * 2 + ((v >>> i) & 1);
  return out;
}

/** The codec string from the record's first 13 bytes (ISO/IEC 14496-15 Annex E.3). */
function codecString(r: Uint8Array): string {
  const space = ["", "A", "B", "C"][r[1] >> 6];
  const tier = (r[1] >> 5) & 1 ? "H" : "L";
  const profile = r[1] & 0x1f;
  const compat = ((r[2] << 24) | (r[3] << 16) | (r[4] << 8) | r[5]) >>> 0;
  const constraints = Array.from(r.subarray(6, 12));
  // Trailing zero bytes of the constraint flags are left out.
  while (constraints.length > 0 && constraints[constraints.length - 1] === 0) constraints.pop();
  const parts = [`hvc1`, `${space}${profile}`, reverse32(compat).toString(16).toUpperCase(), `${tier}${r[12]}`];
  for (const c of constraints) parts.push(c.toString(16).toUpperCase());
  return parts.join(".");
}

/**
 * Checks an `hvcC` record and the SPS inside it. "not-shown": a well-formed record of a kind DotAmi
 * doesn't hand to the graphics chip (10-bit, 4:4:4, another profile, more than one parameter set of a
 * kind). "damaged": a record that doesn't add up.
 */
export function readHvcc(record: Uint8Array): HevcResult {
  try {
    if (record.length < 23 || record[0] !== 1) return { ok: false, code: "damaged" };
    const profileSpace = record[1] >> 6;
    const profile = record[1] & 0x1f;
    const chroma = record[16] & 0x03;
    const bitDepthLuma = (record[17] & 0x07) + 8;
    const bitDepthChroma = (record[18] & 0x07) + 8;
    const lengthSize = (record[21] & 0x03) + 1;
    if (lengthSize === 3) return { ok: false, code: "damaged" };
    if (profileSpace !== 0 || !(SHOWN_PROFILES as readonly number[]).includes(profile) || chroma !== 1 || bitDepthLuma !== 8 || bitDepthChroma !== 8) {
      return { ok: false, code: "not-shown" };
    }

    const arrayCount = record[22];
    if (arrayCount > MAX_HVCC_ARRAYS) return { ok: false, code: "damaged" };
    const counts = new Map<number, number>();
    let sps: Uint8Array | null = null;
    let at = 23;
    for (let a = 0; a < arrayCount; a += 1) {
      if (at + 3 > record.length) return { ok: false, code: "damaged" };
      const type = record[at] & 0x3f;
      const n = (record[at + 1] << 8) | record[at + 2];
      at += 3;
      for (let i = 0; i < n; i += 1) {
        if (at + 2 > record.length) return { ok: false, code: "damaged" };
        const length = (record[at] << 8) | record[at + 1];
        at += 2;
        if (length < 2 || at + length > record.length) return { ok: false, code: "damaged" };
        const nal = record.subarray(at, at + length);
        at += length;
        const actual = nalType(nal);
        if (actual !== type) return { ok: false, code: actual === -1 ? "not-shown" : "damaged" };
        counts.set(type, (counts.get(type) ?? 0) + 1);
        if (type === SPS) sps = nal;
      }
    }
    // Nothing after the last list: a record with a tail isn't one an encoder wrote.
    if (at !== record.length) return { ok: false, code: "damaged" };
    for (const type of counts.keys()) {
      if (![VPS, SPS, PPS, PREFIX_SEI, SUFFIX_SEI].includes(type)) return { ok: false, code: "not-shown" };
    }
    // Exactly one parameter set of each kind (the maintainer's condition): more would let tiles
    // switch between them, and none means there is nothing to decode with.
    if (counts.get(VPS) !== 1 || counts.get(SPS) !== 1 || counts.get(PPS) !== 1) return { ok: false, code: "not-shown" };

    // The SPS is what the decoder actually follows; it must say the same as the record.
    const s = readSps(sps!);
    if (s.profileSpace !== 0 || s.profile !== profile || s.chroma !== 1 || s.bitDepthLuma !== 8 || s.bitDepthChroma !== 8) {
      return { ok: false, code: "not-shown" };
    }
    if (s.width <= 0 || s.height <= 0 || s.width > s.codedWidth || s.height > s.codedHeight) return { ok: false, code: "damaged" };
    return {
      ok: true,
      config: {
        record,
        codec: codecString(record),
        profile,
        lengthSize,
        codedWidth: s.codedWidth,
        codedHeight: s.codedHeight,
        width: s.width,
        height: s.height,
      },
    };
  } catch {
    return { ok: false, code: "damaged" };
  }
}

/**
 * Checks one tile's coded data: NAL units, each behind a `lengthSize`-byte length, that fill the data
 * exactly; at least one slice, every slice of a key picture; no parameter set of its own (only the
 * record's one set is allowed); nothing but delimiters and SEI messages beside the slices.
 */
export function checkTileData(data: Uint8Array, lengthSize: number): "ok" | HevcRefusal {
  let at = 0;
  let slices = 0;
  while (at < data.length) {
    if (at + lengthSize > data.length) return "damaged";
    let length = 0;
    for (let i = 0; i < lengthSize; i += 1) length = length * 256 + data[at + i];
    at += lengthSize;
    if (length < 2 || at + length > data.length) return "damaged";
    const type = nalType(data.subarray(at, at + length));
    at += length;
    if (type === -1) return "not-shown";
    if (isKeyPicture(type)) slices += 1;
    else if (type < 32) return "not-shown"; // a picture that depends on another, or a reserved slice type
    else if (type !== AUD && type !== PREFIX_SEI && type !== SUFFIX_SEI) return "not-shown";
  }
  return slices > 0 ? "ok" : "damaged";
}
