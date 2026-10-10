// Gives DotAmi's own pages, in the desktop window, exactly two calls about HEIC receipts ([8i]) and
// nothing else from Electron or Node (Electron security checklist #20). The main process
// (desktop/main.mjs, answerHeicQuestions) believes them only from DotAmi's own window and pages.
//   heicStopped(): has a HEIC failed, or the graphics process stopped, since DotAmi started?
//   heicFailed():  a HEIC just failed; don't draw another until DotAmi restarts.
// lib/expenses/receipts/viewer/heic-session.ts is the page's side. CommonJS because sandboxed
// preloads can't be ES modules.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dotamiDesktop", {
  // Any trouble asking counts as "stopped": the graphics chip isn't risked on a guess.
  heicStopped: () => ipcRenderer.invoke("dotami-heic-stopped").then((stopped) => stopped === true, () => true),
  heicFailed: () => ipcRenderer.send("dotami-heic-failed"),
});
