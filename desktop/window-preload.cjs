// Gives DotAmi's own pages, in the desktop window, exactly three calls ([8i]) and nothing else from
// Electron or Node (Electron security checklist #20). The main process (desktop/main.mjs,
// answerWindowCalls) believes them only from DotAmi's own window and pages.
//   heicStopped(): has a HEIC failed, or the graphics process stopped, since DotAmi started?
//   heicFailed():  a HEIC just failed; don't draw another until DotAmi restarts.
//   restartForNewKey(): after Start a new key moved the locked receipts aside, restart DotAmi so it
//     makes the new key (docs/architecture/expense-records.md § 11). The main process decides for
//     itself whether to; the answer is "restarting" (the app is closing) or "refused".
// lib/expenses/receipts/viewer/heic-session.ts and components/expenses/start-new-key.tsx are the page's
// side. CommonJS because sandboxed preloads can't be ES modules.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dotamiDesktop", {
  // Any trouble asking counts as "stopped": the graphics chip isn't risked on a guess.
  heicStopped: () => ipcRenderer.invoke("dotami-heic-stopped").then((stopped) => stopped === true, () => true),
  heicFailed: () => ipcRenderer.send("dotami-heic-failed"),
  // Any trouble asking counts as "refused": the page then says to restart by hand.
  restartForNewKey: () =>
    ipcRenderer.invoke("dotami-restart-for-new-key").then((answer) => (answer === "restarting" ? "restarting" : "refused"), () => "refused"),
});
