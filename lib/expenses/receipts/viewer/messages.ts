/**
 * [8i] What the receipt viewer says when it can't show a receipt (expense-records.md § 8). Kept on
 * their own so the tests read the same sentences without loading the viewer.
 */

/** The sentences the viewer can say. Plain words, what to do next, never anything from the file. */
export const VIEW_MESSAGES = {
  replaced:
    "The file in the receipts folder isn't the kind of file DotAmi kept for this record, so DotAmi won't show it. Remove the receipt and add it again.",
  unreadable:
    "The file in the receipts folder isn't one DotAmi can show safely (it may have been replaced). Remove the receipt and add it again.",
  pdfLocked: "This PDF is locked with a password, so DotAmi can't draw it. The file is kept as it was.",
  pdfFailed: "DotAmi couldn't draw this PDF. The file is kept as it was.",
  pictureFailed: "DotAmi couldn't draw this picture. The file is kept as it was.",
  unreachable: "Could not reach the app. Nothing was changed.",
  // HEIC photos ([8i], option D): drawn by this computer's graphics chip, through the browser's video decoder.
  heicUnsupported:
    "This computer can't show HEIC photos inside DotAmi: DotAmi draws them with the computer's graphics chip, and this one (or this window) can't decode them. The photo is kept exactly as you gave it. To see it, open the original on your phone, or on a computer that shows HEIC photos.",
  heicNotShown:
    "DotAmi doesn't draw this kind of HEIC photo (it draws ordinary 8-bit photos like an iPhone's, not 10-bit, layered or combined ones). The photo is kept exactly as you gave it; open the original on your phone to see it.",
  heicFailed:
    "DotAmi couldn't show this HEIC photo and stopped. The photo is kept exactly as you gave it. DotAmi won't ask the graphics chip to show a HEIC photo again until you restart DotAmi.",
  heicStopped:
    "DotAmi stopped showing HEIC photos for now, because one couldn't be shown (or the computer's graphics process stopped) since DotAmi started. Restart DotAmi to try again. The photo is kept exactly as you gave it.",
} as const;
