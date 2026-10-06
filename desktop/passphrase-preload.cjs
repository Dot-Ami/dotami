// Gives the passphrase window (desktop/passphrase.html) exactly two things it can do — send the
// passphrase, or cancel — plus which form to show. Nothing else from Electron or Node reaches the
// page (Electron security checklist #20). CommonJS because sandboxed preloads can't be ES modules.
const { contextBridge, ipcRenderer } = require("electron");

const query = new URLSearchParams(window.location.search);

contextBridge.exposeInMainWorld("dotamiPassphrase", {
  mode: query.get("mode") === "restore" ? "restore" : "backup",
  message: query.get("message") ?? "",
  submit: (passphrase) => ipcRenderer.send("dotami-passphrase", { passphrase: String(passphrase) }),
  cancel: () => ipcRenderer.send("dotami-passphrase", { cancelled: true }),
});
