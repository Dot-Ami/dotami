/**
 * [8i] HEIC receipts (option D of docs/connectors/heic-decoder-review.md, chosen by the maintainer on
 * 2026-10-09): the brands DotAmi accepts and the limits its own container reader keeps. No node or
 * browser import here, so the server, the window and the viewer's worker read the same numbers.
 */

/**
 * The brands a HEIC photo may carry as its major brand in its first box (`ftyp`): `heic` (an HEVC
 * still image), `heix` (the same with a wider HEVC profile, such as 10-bit) and `mif1` (the general
 * image-file brand, accepted only together with a HEIC brand among the compatible ones, below).
 * The review's corrected rule; the wider list in sniff.ts stays for the refusals.
 */
export const HEIC_MAJOR_BRANDS = ["heic", "heix", "mif1"] as const;

/** With a major brand of `mif1`, one of these must be among the compatible brands, or it isn't a HEIC (an AVIF says `mif1` too). */
export const HEIC_FAMILY_BRANDS = ["heic", "heix"] as const;

/**
 * Brands for image sequences, bursts, animations and layered pictures. A file naming any of them,
 * as its major brand or a compatible one, is not one still photo, and DotAmi doesn't keep it.
 */
export const HEIF_SEQUENCE_BRANDS = ["msf1", "hevc", "hevx", "hevm", "hevs", "heim", "heis"] as const;

/** Every box the reader visits counts toward this; a file that needs more isn't a phone photo. */
export const MAX_BOXES = 4096;

/** Items (pictures, thumbnails, Exif blocks…) in one file. An iPhone photo has a few dozen. */
export const MAX_ITEMS = 2048;

/** Pieces ("extents") one item's data may be split into. Phones write one. */
export const MAX_EXTENTS = 256;

/** Properties in the file's property list. */
export const MAX_PROPERTIES = 1024;

/** Tiles in one grid: a 48-megapixel iPhone photo has 192 tiles of 512 × 512. */
export const MAX_TILES = 1024;

/** HEVC parameter-set and SEI lists in a decoder configuration record (`hvcC`). */
export const MAX_HVCC_ARRAYS = 8;

/** The HEVC profiles DotAmi hands to the graphics chip: Main (1) and Main Still Picture (3), 8-bit 4:2:0. */
export const SHOWN_PROFILES = [1, 3] as const;
