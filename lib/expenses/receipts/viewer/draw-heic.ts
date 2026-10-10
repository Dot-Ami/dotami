/**
 * [8i] Draws a HEIC receipt inside the receipt viewer's own worker (heic-picture.worker.ts), with the
 * browser's video decoder (WebCodecs' VideoDecoder), which hands the HEVC data to the computer's
 * graphics chip. Option D of docs/connectors/heic-decoder-review.md, chosen by the maintainer on
 * 2026-10-09; the conditions it was chosen under are in that review's "What was chosen" section.
 *
 * Order, each step only if the one before passed:
 *   1. heicPicture (lib/expenses/receipts/heic/picture.ts) checks the file with DotAmi's own reader:
 *      one still picture, HEVC Main / Main Still Picture 8-bit 4:2:0, one parameter set of each kind,
 *      tiles the declared size, the pixel caps. Nothing has reached the decoder yet.
 *   2. VideoDecoder.isConfigSupported: a computer (or browser) that can't decode it says so here,
 *      and the viewer says it can't show HEIC photos on this computer.
 *   3. One VideoDecoder for this one picture. Every tile goes in as a key chunk; each decoded frame is
 *      drawn onto an OffscreenCanvas at its place in the grid and closed at once. The decoder is closed
 *      at the end, whatever happened.
 *   4. The crop, rotation and mirroring, in the file's order; the finished picture goes back to the
 *      page as an ImageBitmap. Nothing decoded is kept anywhere else.
 *
 * Any error from the decoder ends the drawing ("failed"); the page then stops this worker and doesn't
 * try a HEIC again until DotAmi restarts (open.ts). The page also stops the worker after 20 seconds.
 * Nothing here retries.
 */

import { heicPicture, type HeicPlan, type Transform } from "../heic/picture";
import type { HeicDrawResult } from "./types";

/** A 2D canvas the size of the picture. OffscreenCanvas in the worker; a stand-in in the tests. */
export interface Surface {
  width: number;
  height: number;
  getContext(kind: "2d"): DrawContext | null;
  transferToImageBitmap(): ImageBitmap;
}

/** The parts of a 2D context this file uses. */
export interface DrawContext {
  drawImage(image: CanvasImageSource | Surface, dx: number, dy: number): void;
  drawImage(image: CanvasImageSource | Surface, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
}

/** What the drawing needs from the browser; the tests hand in stand-ins. */
export interface DecodeEnvironment {
  VideoDecoder: typeof VideoDecoder | undefined;
  EncodedVideoChunk: typeof EncodedVideoChunk | undefined;
  surface(width: number, height: number): Surface;
}

export const browserEnvironment = (): DecodeEnvironment => ({
  VideoDecoder: typeof VideoDecoder === "undefined" ? undefined : VideoDecoder,
  EncodedVideoChunk: typeof EncodedVideoChunk === "undefined" ? undefined : EncodedVideoChunk,
  surface: (width, height) => new OffscreenCanvas(width, height) as unknown as Surface,
});

/** How many tiles are queued before waiting for the decoder to catch up (keeps the graphics chip's queue short). */
const BATCH = 16;

/** The decoder configuration for a checked plan: the codec string, the `hvcC` record, the coded size. */
export const decoderConfig = (plan: HeicPlan): VideoDecoderConfig => ({
  codec: plan.config.codec,
  description: plan.config.record,
  codedWidth: plan.config.codedWidth,
  codedHeight: plan.config.codedHeight,
});

/** Never throws, and never passes on an exception's text. */
export async function drawHeic(bytes: Uint8Array, env: DecodeEnvironment): Promise<HeicDrawResult> {
  const checked = heicPicture(bytes);
  if (!checked.ok) return { ok: false, code: checked.code === "too-many-pixels" ? "too-many-pixels" : checked.code === "not-shown" ? "not-shown" : "damaged" };
  const plan = checked.plan;
  if (!env.VideoDecoder || !env.EncodedVideoChunk) return { ok: false, code: "unsupported" };

  const config = decoderConfig(plan);
  try {
    const support = await env.VideoDecoder.isConfigSupported(config);
    if (!support.supported) return { ok: false, code: "unsupported" };
  } catch {
    return { ok: false, code: "unsupported" };
  }

  let canvas: Surface;
  try {
    canvas = env.surface(plan.width, plan.height);
  } catch {
    return { ok: false, code: "failed" };
  }
  const context = canvas.getContext("2d");
  if (!context) return { ok: false, code: "failed" };

  let failed = false;
  const drawn = new Set<number>();
  const decoder = new env.VideoDecoder({
    output: (frame) => {
      try {
        // Each tile went in with its index as its timestamp; anything else, or a frame of another size, is wrong.
        const index = frame.timestamp;
        if (!Number.isInteger(index) || index < 0 || index >= plan.tiles.length || drawn.has(index)) failed = true;
        else if (frame.displayWidth !== plan.tileWidth || frame.displayHeight !== plan.tileHeight) failed = true;
        else {
          context.drawImage(frame, (index % plan.columns) * plan.tileWidth, Math.floor(index / plan.columns) * plan.tileHeight);
          drawn.add(index);
        }
      } finally {
        // Closed right after drawing: a frame holds graphics memory until it is.
        frame.close();
      }
    },
    error: () => {
      failed = true;
    },
  });
  try {
    decoder.configure(config);
    for (let i = 0; i < plan.tiles.length && !failed; i += 1) {
      decoder.decode(new env.EncodedVideoChunk({ type: "key", timestamp: i, data: plan.tiles[i] }));
      if ((i + 1) % BATCH === 0) await decoder.flush();
    }
    if (!failed) await decoder.flush();
  } catch {
    failed = true;
  } finally {
    if (decoder.state !== "closed") decoder.close();
  }
  if (failed || drawn.size !== plan.tiles.length) return { ok: false, code: "failed" };

  try {
    const shown = applyTransforms(canvas, plan.transforms, env);
    return { ok: true, picture: shown.transferToImageBitmap(), width: plan.shownWidth, height: plan.shownHeight };
  } catch {
    return { ok: false, code: "failed" };
  }
}

/**
 * The crop, rotation and mirroring, one after another on fresh canvases. Each earlier canvas is
 * emptied as soon as the next one has its pixels, so at most two pictures are held at once.
 */
export function applyTransforms(source: Surface, transforms: Transform[], env: DecodeEnvironment): Surface {
  let current = source;
  for (const t of transforms) {
    let next: Surface;
    if (t.kind === "crop") {
      next = env.surface(t.width, t.height);
      next.getContext("2d")!.drawImage(current, t.x, t.y, t.width, t.height, 0, 0, t.width, t.height);
    } else if (t.kind === "rotate") {
      const odd = t.quarterTurns % 2 === 1;
      const w = odd ? current.height : current.width;
      const h = odd ? current.width : current.height;
      next = env.surface(w, h);
      const g = next.getContext("2d")!;
      // Anticlockwise, as the format counts: one turn sends (x, y) to (y, W - x).
      if (t.quarterTurns === 1) {
        g.translate(0, current.width);
        g.rotate(-Math.PI / 2);
      } else if (t.quarterTurns === 2) {
        g.translate(current.width, current.height);
        g.rotate(Math.PI);
      } else {
        g.translate(current.height, 0);
        g.rotate(Math.PI / 2);
      }
      g.drawImage(current, 0, 0);
    } else {
      next = env.surface(current.width, current.height);
      const g = next.getContext("2d")!;
      if (t.flip === "horizontal") {
        g.translate(current.width, 0);
        g.scale(-1, 1);
      } else {
        g.translate(0, current.height);
        g.scale(1, -1);
      }
      g.drawImage(current, 0, 0);
    }
    current.width = 0;
    current.height = 0;
    current = next;
  }
  return current;
}
