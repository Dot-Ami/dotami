/**
 * [8i] The desktop app keeps Chromium's sandboxes as they are. A condition of the maintainer's choice
 * of option D for HEIC receipts (docs/connectors/heic-decoder-review.md § What was chosen): a HEIC's
 * bytes are parsed in the window's renderer and its graphics process, and those two sandboxes are what
 * stands between a hostile file and the computer. So nothing in the desktop app may switch them off or
 * move the graphics process into the browser process, and every window it opens is sandboxed and
 * isolated. Also: every preload a window names ships in the installed app, and the main window's
 * preload gives a page nothing but its two HEIC calls.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const desktop = path.join(root, "desktop");

/** Every file of the desktop app, plus package.json (its scripts and build settings start Electron). */
const sources = () => [
  ...readdirSync(desktop)
    .filter((f) => /\.(mjs|cjs|js|html)$/.test(f))
    .map((f) => ({ file: `desktop/${f}`, text: readFileSync(path.join(desktop, f), "utf8") })),
  { file: "package.json", text: readFileSync(path.join(root, "package.json"), "utf8") },
];

/** Chromium switches that turn a sandbox off, or run the graphics or every process inside the browser process. */
const FORBIDDEN_SWITCHES = ["no-sandbox", "disable-gpu-sandbox", "in-process-gpu", "disable-setuid-sandbox", "single-process", "no-zygote"];

/** The forbidden switches and settings found in one file's text. */
function sandboxBreaks(text: string): string[] {
  const found = FORBIDDEN_SWITCHES.filter((s) => text.includes(s));
  if (/sandbox\s*:\s*false/.test(text)) found.push("sandbox: false");
  if (/contextIsolation\s*:\s*false/.test(text)) found.push("contextIsolation: false");
  if (/nodeIntegration\s*:\s*true/.test(text)) found.push("nodeIntegration: true");
  if (/enableSandbox\s*\(\s*false/.test(text)) found.push("enableSandbox(false)");
  return found;
}

describe("the desktop app keeps Chromium's sandboxes", () => {
  it("sees the files it means to check, and would see a switch if one were added", () => {
    const files = sources().map((s) => s.file);
    expect(files).toEqual(expect.arrayContaining(["desktop/main.mjs", "desktop/window-preload.cjs", "desktop/passphrase-preload.cjs", "package.json"]));
    // The check itself, on text that breaks each rule (so a passing run means "none found", not "never looked").
    expect(sandboxBreaks(`app.commandLine.appendSwitch("no-sandbox")`)).toEqual(["no-sandbox"]);
    expect(sandboxBreaks(`app.commandLine.appendSwitch("disable-gpu-sandbox")`)).toEqual(["disable-gpu-sandbox"]);
    expect(sandboxBreaks(`"desktop": "electron . --in-process-gpu"`)).toEqual(["in-process-gpu"]);
    expect(sandboxBreaks(`webPreferences: { sandbox:false }`)).toEqual(["sandbox: false"]);
  });

  it("finds no switch that turns a sandbox off, and no window without its sandbox", () => {
    for (const { file, text } of sources()) expect(sandboxBreaks(text), file).toEqual([]);
  });

  it("opens every window sandboxed and isolated", () => {
    const main = readFileSync(path.join(desktop, "main.mjs"), "utf8");
    const windows = main.split("new BrowserWindow(").slice(1);
    expect(windows.length).toBeGreaterThanOrEqual(2); // the main window and the passphrase window
    for (const w of windows) {
      const prefs = w.slice(0, w.indexOf("});") + 3);
      expect(prefs).toMatch(/sandbox: true/);
      expect(prefs).toMatch(/contextIsolation: true/);
      expect(prefs).toMatch(/nodeIntegration: false/);
    }
  });

  it("ships every preload a window names, and the main window's gives a page only its two HEIC calls", () => {
    const main = readFileSync(path.join(desktop, "main.mjs"), "utf8");
    const pack = readFileSync(path.join(desktop, "package.mjs"), "utf8");
    const preloads = [...main.matchAll(/preload: path\.join\(root, "desktop", "([^"]+)"\)/g)].map((m) => m[1]);
    expect(preloads.sort()).toEqual(["passphrase-preload.cjs", "window-preload.cjs"]);
    for (const p of preloads) expect(pack, p).toContain(`"${p}"`);

    const preload = readFileSync(path.join(desktop, "window-preload.cjs"), "utf8");
    expect(preload.match(/exposeInMainWorld\(/g)).toHaveLength(1);
    expect([...preload.matchAll(/ipcRenderer\.(\w+)\(/g)].map((m) => m[1]).sort()).toEqual(["invoke", "send"]);
    expect([...preload.matchAll(/"(dotami-[a-z-]+)"/g)].map((m) => m[1]).sort()).toEqual(["dotami-heic-failed", "dotami-heic-stopped"]);
    // The main process believes them only from DotAmi's own window, and keeps the graphics-process watch.
    expect(main).toMatch(/app\.on\("child-process-gone"/);
    expect(main).toMatch(/details\.type !== "GPU"/);
    expect(main).toMatch(/event\.sender !== win\.webContents/);
  });
});
