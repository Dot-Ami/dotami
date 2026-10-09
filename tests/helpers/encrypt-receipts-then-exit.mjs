// Runs the first-start encryption of a receipts folder and ends the process for real (process.exit,
// no clean-up, no finally blocks) the moment file number <at> (0-based) reaches <step>: what a crash or
// a killed app leaves behind. Used by tests/receipt-crypto.spec.ts.
//   node encrypt-receipts-then-exit.mjs <folder> <key as base64> <temp-written|renamed> <at>
import { writeSync } from "node:fs";

import { isReceiptFileName } from "../../desktop/backup.mjs";
import { encryptReceiptsIn } from "../../desktop/receipt-crypto.mjs";

const [folder, keyBase64, stopStep, stopAt] = process.argv.slice(2);
let reached = 0;
encryptReceiptsIn(folder, Buffer.from(keyBase64, "base64"), {
  isReceiptName: isReceiptFileName,
  onStep(step) {
    if (step !== stopStep) return;
    if (reached === Number(stopAt)) {
      // Written synchronously: process.exit doesn't wait for a pipe to drain.
      writeSync(1, `stopping at ${stopStep} ${stopAt}\n`);
      process.exit(0);
    }
    reached += 1;
  },
});
