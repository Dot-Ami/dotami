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
} as const;
