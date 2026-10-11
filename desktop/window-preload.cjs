// Gives DotAmi's own pages, in the desktop window, exactly five calls ([8i]) and nothing else from
// Electron or Node (Electron security checklist #20). The main process (desktop/main.mjs,
// answerWindowCalls) believes them only from DotAmi's own window and pages.
//   heicStopped(): has a HEIC failed, or the graphics process stopped, since DotAmi started?
//   heicFailed():  a HEIC just failed; don't draw another until DotAmi restarts.
//   restartForNewKey(): after Start a new key moved the locked receipts aside, restart DotAmi so it
//     makes the new key (docs/architecture/expense-records.md § 11). The main process decides for
//     itself whether to; the answer is "restarting" (the app is closing) or "refused".
//   listSetAsideReceipts(): the receipts Start a new key set aside, by folder, with how many of them an
//     old key this Windows account can open again (expense-records.md § 12).
//   bringBackReceipts(folder): bring one such folder's receipts back, locked with the current key. The
//     main process checks everything itself; the page only names the folder.
// lib/expenses/receipts/viewer/heic-session.ts, components/expenses/start-new-key.tsx and
// components/expenses/bring-back-receipts.tsx are the page's side. CommonJS because sandboxed preloads
// can't be ES modules.
const { contextBridge, ipcRenderer } = require("electron");

/** Any trouble asking counts as a refusal: the page then says the desktop app didn't answer. */
const refused = () => ({ outcome: "refused", reason: "no-answer" });

contextBridge.exposeInMainWorld("dotamiDesktop", {
  // Any trouble asking counts as "stopped": the graphics chip isn't risked on a guess.
  heicStopped: () => ipcRenderer.invoke("dotami-heic-stopped").then((stopped) => stopped === true, () => true),
  heicFailed: () => ipcRenderer.send("dotami-heic-failed"),
  // Any trouble asking counts as "refused": the page then says to restart by hand.
  restartForNewKey: () =>
    ipcRenderer.invoke("dotami-restart-for-new-key").then((answer) => (answer === "restarting" ? "restarting" : "refused"), () => "refused"),
  listSetAsideReceipts: () => ipcRenderer.invoke("dotami-list-set-aside-receipts").then((answer) => answer ?? refused(), refused),
  // Only a string goes across: the main process checks it against the names DotAmi gives its folders.
  bringBackReceipts: (folder) => ipcRenderer.invoke("dotami-bring-back-receipts", String(folder)).then((answer) => answer ?? refused(), refused),
});
