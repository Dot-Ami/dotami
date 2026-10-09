/**
 * [8f] Read last year's return — every refusal, as the plain sentence the person reads.
 *
 * Each one says what happened and what to do instead, and that nothing was kept. None of them
 * quotes the file. Wealthsimple Tax is named because it is the one program whose save step has
 * been looked at so far (its "Save PDF" button on the Submit page, in its 2025 version, seen in
 * October 2026); other programs get the general advice.
 */

import { MAX_RETURN_BYTES, MAX_RETURN_PAGES, type RefusalCode } from "./types";

const NOTHING_KEPT = "Nothing from it was kept.";

export const REFUSALS: Record<RefusalCode, string> = {
  empty: `That file is empty. ${NOTHING_KEPT}`,
  "too-big": `That file is over ${MAX_RETURN_BYTES / (1024 * 1024)} MB, more than DotAmi reads. Save the return again from your tax software as a PDF and drop that. ${NOTHING_KEPT}`,
  "not-pdf": `That isn't a PDF. Drop the PDF copy of your return that your tax software saves (in Wealthsimple Tax, Save PDF on the Submit page). ${NOTHING_KEPT}`,
  password: `That PDF is locked with a password, and DotAmi never asks for one. Open it with its password, save or print a copy as a PDF without one, and drop that copy. ${NOTHING_KEPT}`,
  "too-many-pages": `That PDF has more than ${MAX_RETURN_PAGES} pages, more than one return. Drop the PDF of just your return. ${NOTHING_KEPT}`,
  "pictures-only": `That PDF is pictures of pages, with no text DotAmi can read: a scan or a photo. DotAmi can't read pictures of a return yet. Drop the PDF your tax software saves instead (in Wealthsimple Tax, Save PDF on the Submit page). ${NOTHING_KEPT}`,
  "no-t2125": `DotAmi found no T2125 (Statement of Business or Professional Activities) in that PDF. If your tax software saved a short summary, save the full return instead (in Wealthsimple Tax, Save PDF on the Submit page) and drop that. ${NOTHING_KEPT}`,
  failed: `DotAmi couldn't read that PDF. ${NOTHING_KEPT}`,
};
