/**
 * [8i] The sentence a person reads when a receipt file isn't kept or can't be shown. Plain words,
 * what to do next, and never the file's name or contents.
 */

import type { ReceiptRefusalCode } from "./types";

export const RECEIPT_REFUSALS: Record<ReceiptRefusalCode, string> = {
  empty: "That file is empty, so there is nothing to keep.",
  "too-big": "That file is over 10 MB, the most a receipt can be. A smaller photo or a PDF of just the receipt will fit.",
  svg: "That file is an SVG drawing, which can carry a script, so DotAmi doesn't keep it. Save the receipt as a JPEG, PNG or PDF instead.",
  html: "That file is a web page or other text, not a picture or a PDF, so DotAmi doesn't keep it. Print it to a PDF, or take a screenshot, and add that.",
  heic: "That file is a HEIC photo (what iPhones save by default). DotAmi can't show HEIC safely yet, so it doesn't keep it. Share or export the photo as a JPEG and add that.",
  gif: "That file is a GIF. DotAmi keeps JPEG, PNG, WebP and PDF receipts; save it as one of those.",
  "other-picture": "DotAmi keeps JPEG, PNG, WebP and PDF receipts, and this picture is another kind. Save it as one of those.",
  "not-a-receipt-type": "That file isn't a JPEG, PNG, WebP or PDF, so DotAmi doesn't keep it as a receipt. The file's name doesn't matter: DotAmi looks at what is inside it.",
  damaged: "That file looks damaged: its beginning says what it is, but not its size. Try saving it again, or take a new photo.",
  "too-many-pixels":
    "That picture is too large to show safely (over 50 megapixels, or over 20,000 pixels on a side). Save a smaller copy and add that.",
};
