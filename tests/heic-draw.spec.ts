/**
 * [8i] Drawing a HEIC with the browser's video decoder (lib/expenses/receipts/viewer/draw-heic.ts),
 * with stand-ins for VideoDecoder and the canvas, so the order and the clean-up are checked on any
 * computer: DotAmi's own checks before anything reaches the decoder, isConfigSupported asked first,
 * one decoder for the picture, every tile a key chunk, every frame closed as soon as it is drawn, the
 * decoder closed whatever happens, any decoder error the end of it. Also what the page does with the
 * answer (heicMessage, heic-session.ts). The real decoder is driven by the desktop test where the
 * computer's graphics chip decodes HEVC (e2e-desktop/desktop.spec.ts), and the "can't show" sentence
 * by the browser test (e2e/receipt-viewer.spec.ts).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { applyTransforms, drawHeic, type DecodeEnvironment, type DrawContext, type Surface } from "@/lib/expenses/receipts/viewer/draw-heic";
import { __resetHeicSessionForTests, heicFailed, heicStopped } from "@/lib/expenses/receipts/viewer/heic-session";
import { VIEW_MESSAGES } from "@/lib/expenses/receipts/viewer/messages";
import { heicMessage } from "@/lib/expenses/receipts/viewer/open";
import { heic, INVENTED_HVCC, TILE } from "./helpers/heic-files";

const bytes = (b: Buffer) => new Uint8Array(b);

/** A canvas stand-in that records what is drawn on it. */
class FakeSurface implements Surface {
  calls: unknown[][] = [];
  constructor(
    public width: number,
    public height: number,
  ) {}
  getContext(): DrawContext {
    const record =
      (name: string) =>
      (...args: unknown[]) =>
        this.calls.push([name, ...args.map((a) => (a instanceof FakeSurface ? "surface" : a instanceof FakeFrame ? `frame ${a.timestamp}` : a))]);
    return { drawImage: record("drawImage"), translate: record("translate"), rotate: record("rotate"), scale: record("scale") } as unknown as DrawContext;
  }
  transferToImageBitmap(): ImageBitmap {
    return { width: this.width, height: this.height, close() {} } as unknown as ImageBitmap;
  }
}

class FakeFrame {
  closed = false;
  constructor(
    readonly timestamp: number,
    readonly displayWidth = TILE,
    readonly displayHeight = TILE,
  ) {}
  close() {
    this.closed = true;
  }
}

/** What the fake decoder does with each chunk: "frame" (the right size), "wrong-size", "error", or "nothing". */
type Behaviour = "frame" | "wrong-size" | "error" | "nothing";

function environment(options: { supported?: boolean | "throws"; behaviour?: (index: number) => Behaviour; flushRejects?: boolean } = {}) {
  const log: string[] = [];
  const frames: FakeFrame[] = [];
  const chunks: { type: string; timestamp: number; length: number }[] = [];
  const surfaces: FakeSurface[] = [];
  let decoders = 0;
  let decoder: { state: string } | null = null;

  class FakeDecoder {
    state = "unconfigured";
    private output: (frame: FakeFrame) => void;
    private error: (e: unknown) => void;
    private pending: FakeFrame[] = [];
    constructor(init: { output: (frame: FakeFrame) => void; error: (e: unknown) => void }) {
      log.push("new VideoDecoder");
      decoders += 1;
      this.output = init.output;
      this.error = init.error;
      decoder = this;
    }
    static async isConfigSupported(config: VideoDecoderConfig) {
      log.push(`isConfigSupported ${config.codec}`);
      if (options.supported === "throws") throw new TypeError("bad config");
      return { supported: options.supported ?? true, config };
    }
    configure(config: VideoDecoderConfig) {
      log.push(`configure ${config.codec} ${(config.description as Uint8Array).length}`);
      this.state = "configured";
    }
    decode(chunk: { type: string; timestamp: number; byteLength: number }) {
      chunks.push({ type: chunk.type, timestamp: chunk.timestamp, length: chunk.byteLength });
      const what = options.behaviour?.(chunk.timestamp) ?? "frame";
      if (what === "frame") this.pending.push(new FakeFrame(chunk.timestamp));
      if (what === "wrong-size") this.pending.push(new FakeFrame(chunk.timestamp, 64, 64));
      if (what === "error") {
        // A real decoder closes itself and reports an EncodingError.
        this.state = "closed";
        this.error(new DOMException("bad", "EncodingError"));
      }
    }
    async flush() {
      if (options.flushRejects || this.state === "closed") throw new DOMException("closed", "InvalidStateError");
      for (const f of this.pending.splice(0)) {
        frames.push(f);
        this.output(f);
      }
    }
    close() {
      log.push("close");
      this.state = "closed";
    }
  }

  class FakeChunk {
    type: string;
    timestamp: number;
    byteLength: number;
    constructor(init: { type: string; timestamp: number; data: Uint8Array }) {
      this.type = init.type;
      this.timestamp = init.timestamp;
      this.byteLength = init.data.length;
    }
  }

  const env: DecodeEnvironment = {
    VideoDecoder: FakeDecoder as unknown as typeof VideoDecoder,
    EncodedVideoChunk: FakeChunk as unknown as typeof EncodedVideoChunk,
    surface: (w, h) => {
      const s = new FakeSurface(w, h);
      surfaces.push(s);
      return s;
    },
  };
  return { env, log, frames, chunks, surfaces, decoders: () => decoders, decoder: () => decoder };
}

describe("drawing a HEIC with the video decoder", () => {
  it("asks isConfigSupported first, then decodes every tile as a key chunk into its place, closing every frame and the decoder", async () => {
    const t = environment();
    const result = await drawHeic(bytes(heic()), t.env);
    expect(result).toMatchObject({ ok: true, width: 256, height: 256 });
    expect(t.log[0]).toBe("isConfigSupported hvc1.1.2.L186.90");
    expect(t.log[1]).toBe("new VideoDecoder");
    expect(t.log[2]).toBe(`configure hvc1.1.2.L186.90 ${INVENTED_HVCC.length}`);
    expect(t.log.at(-1)).toBe("close");
    expect(t.decoders()).toBe(1);
    expect(t.chunks.map((c) => [c.type, c.timestamp])).toEqual([
      ["key", 0],
      ["key", 1],
      ["key", 2],
      ["key", 3],
    ]);
    expect(t.frames).toHaveLength(4);
    expect(t.frames.every((f) => f.closed)).toBe(true);
    // Left to right, top to bottom, at the tile size.
    expect(t.surfaces[0].calls).toEqual([
      ["drawImage", "frame 0", 0, 0],
      ["drawImage", "frame 1", 128, 0],
      ["drawImage", "frame 2", 0, 128],
      ["drawImage", "frame 3", 128, 128],
    ]);
  });

  it("says 'unsupported' without making a decoder when the computer can't decode it, or has no decoder at all", async () => {
    for (const supported of [false, "throws"] as const) {
      const t = environment({ supported });
      expect(await drawHeic(bytes(heic()), t.env)).toEqual({ ok: false, code: "unsupported" });
      expect(t.decoders()).toBe(0);
    }
    const none = environment();
    expect(await drawHeic(bytes(heic()), { ...none.env, VideoDecoder: undefined })).toEqual({ ok: false, code: "unsupported" });
  });

  it("hands nothing to the decoder, not even the question, when DotAmi's own reader refuses the file", async () => {
    const tenBit = Buffer.from(INVENTED_HVCC);
    tenBit[17] = 0xfa;
    for (const [file, code] of [
      [heic({ hvcc: tenBit }), "not-shown"],
      [heic().subarray(0, 300), "damaged"],
      [heic({ primarySize: { width: 30_000, height: 30_000 } }), "too-many-pixels"],
    ] as const) {
      const t = environment();
      expect(await drawHeic(bytes(file), t.env)).toEqual({ ok: false, code });
      expect(t.log).toEqual([]);
    }
  });

  it("stops at a decoder error: no more tiles, the decoder closed, 'failed'", async () => {
    const t = environment({ behaviour: (i) => (i === 1 ? "error" : "frame") });
    expect(await drawHeic(bytes(heic()), t.env)).toEqual({ ok: false, code: "failed" });
    expect(t.chunks).toHaveLength(2);
    expect(t.decoder()?.state).toBe("closed");
  });

  it("calls it failed when a frame is the wrong size, a tile never comes back, or the flush fails; every frame still closed", async () => {
    for (const options of [{ behaviour: (i: number) => (i === 2 ? "wrong-size" : "frame") as Behaviour }, { behaviour: (i: number) => (i === 3 ? "nothing" : "frame") as Behaviour }, { flushRejects: true }]) {
      const t = environment(options);
      expect(await drawHeic(bytes(heic()), t.env)).toEqual({ ok: false, code: "failed" });
      expect(t.frames.every((f) => f.closed)).toBe(true);
      expect(t.log.at(-1)).toBe("close");
    }
  });

  it("applies the crop, rotation and mirroring in order, on fresh canvases, emptying each one it leaves", () => {
    const t = environment();
    const source = new FakeSurface(256, 128);
    const shown = applyTransforms(
      source,
      [
        { kind: "crop", x: 28, y: 14, width: 200, height: 100 },
        { kind: "rotate", quarterTurns: 1 },
        { kind: "mirror", flip: "horizontal" },
      ],
      t.env,
    ) as FakeSurface;
    expect([shown.width, shown.height]).toEqual([100, 200]);
    expect(t.surfaces.map((s) => [s.width, s.height])).toEqual([
      [0, 0],
      [0, 0],
      [100, 200],
    ]);
    expect(source.width).toBe(0);
    // The crop copies the rectangle; the quarter turn anticlockwise moves the origin down by the old width.
    expect(t.surfaces[0].calls).toEqual([["drawImage", "surface", 28, 14, 200, 100, 0, 0, 200, 100]]);
    expect(t.surfaces[1].calls).toEqual([
      ["translate", 0, 200],
      ["rotate", -Math.PI / 2],
      ["drawImage", "surface", 0, 0],
    ]);
    expect(shown.calls).toEqual([
      ["translate", 100, 0],
      ["scale", -1, 1],
      ["drawImage", "surface", 0, 0],
    ]);
  });
});

describe("what the page does with the answer", () => {
  afterEach(() => {
    __resetHeicSessionForTests();
    vi.unstubAllGlobals();
  });

  it("says each answer in its own plain sentence", () => {
    expect(heicMessage("unsupported")).toBe(VIEW_MESSAGES.heicUnsupported);
    expect(heicMessage("not-shown")).toBe(VIEW_MESSAGES.heicNotShown);
    expect(heicMessage("failed")).toBe(VIEW_MESSAGES.heicFailed);
    expect(VIEW_MESSAGES.heicUnsupported).toMatch(/kept exactly as you gave it/);
    expect(VIEW_MESSAGES.heicUnsupported).toMatch(/open the original on your phone/);
  });

  it("stops HEIC after one failure in the page, and asks the desktop app, which may say it stopped", async () => {
    expect(await heicStopped()).toBe(false);
    const told: string[] = [];
    let mainSays: boolean | "throws" = false;
    vi.stubGlobal("window", {
      dotamiDesktop: {
        heicStopped: async () => {
          if (mainSays === "throws") throw new Error("no answer");
          return mainSays;
        },
        heicFailed: () => told.push("failed"),
      },
    });
    expect(await heicStopped()).toBe(false);
    mainSays = true; // the graphics process stopped, or another page's HEIC failed
    expect(await heicStopped()).toBe(true);
    mainSays = "throws"; // can't ask: don't risk it
    expect(await heicStopped()).toBe(true);
    mainSays = false;
    heicFailed();
    expect(told).toEqual(["failed"]);
    expect(await heicStopped()).toBe(true);
  });
});
