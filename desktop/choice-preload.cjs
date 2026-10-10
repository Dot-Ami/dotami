// [8i] Gives the desktop app's two start-up windows exactly one thing they can do: send which button was
// pressed, one of a fixed list of answers for that window, plus a status line to show. The window before
// the first encryption (desktop/encrypt-ask.html) and the window when the data file's key can't be opened
// (desktop/lost-key.html). Nothing else from Electron or Node reaches the page (Electron security
// checklist #20). CommonJS because sandboxed preloads can't be ES modules.
const { contextBridge, ipcRenderer } = require("electron");

const query = new URLSearchParams(window.location.search);
/** The answers each window may send; anything else is never sent. desktop/main.mjs checks them again. */
const ANSWERS = {
  "encrypt-ask": ["encrypt", "backup", "not-now", "never"],
  "lost-key": ["quit", "open-folder", "restore"],
};
const which = query.get("which") ?? "";
const allowed = ANSWERS[which] ?? [];

contextBridge.exposeInMainWorld("dotamiChoice", {
  status: query.get("status") ?? "",
  detail: query.get("detail") ?? "",
  answer: (choice) => {
    if (allowed.includes(choice)) ipcRenderer.send("dotami-choice", { which, answer: choice });
  },
});
