// The passphrase window's behaviour. Runs in a sandboxed page with no Node and no network; it
// talks to the app only through `window.dotamiPassphrase` (desktop/passphrase-preload.cjs).
(() => {
  const bridge = window.dotamiPassphrase;
  const $ = (id) => document.getElementById(id);
  const backup = bridge.mode === "backup";

  $("title").textContent = backup ? "Back up DotAmi" : "This backup is locked";
  // [8i] Every backup is locked (the maintainer's decision of 2026-10-10): it holds the data decrypted,
  // so it restores on another computer, and the passphrase is what keeps it locked.
  $("intro").textContent = backup
    ? "Choose a passphrase to lock this backup. Every backup needs one: a backup holds your data and receipts unencrypted inside it, so it can be restored on another computer, and the passphrase is what keeps it locked."
    : "Enter the passphrase it was locked with.";
  $("ok").textContent = backup ? "Back up" : "Open";
  $("confirm-row").hidden = !backup;
  if (backup) {
    // The warning from the settings doc, Part 1 ("Backup passphrase"), word for word.
    $("warning").textContent = "Warning: lose it and the backup can't be opened — nobody can recover it.";
    $("warning").hidden = false;
  }
  $("error").textContent = bridge.message || "";

  $("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const pass = $("pass").value;
    if (backup && pass === "") {
      $("error").textContent = "Choose a passphrase: every backup is locked with one.";
      return;
    }
    if (backup && pass !== $("confirm").value) {
      $("error").textContent = "The two passphrases don't match.";
      return;
    }
    if (!backup && pass === "") {
      $("error").textContent = "Enter the passphrase, or press Cancel.";
      return;
    }
    bridge.submit(pass);
  });
  $("cancel").addEventListener("click", () => bridge.cancel());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") bridge.cancel();
  });
  $("pass").focus();
})();
