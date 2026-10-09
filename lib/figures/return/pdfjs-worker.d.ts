// pdf.js ships no type file for its parser module; the return reader's worker only hands it back to
// pdf.js as `globalThis.pdfjsWorker`, so this is all it needs.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}
