// The passphrase window's behaviour. Runs in a sandboxed page with no Node and no network; it
// talks to the app only through `window.dotamiPassphrase` (desktop/passphrase-preload.cjs).
(() => {
  const bridge = window.dotamiPassphrase;
  const $ = (id) => document.getElementById(id);
  const backup = bridge.mode === "backup";

  $("title").textContent = backup ? "Back up DotAmi" : "This backup is locked";
  $("intro").textContent = backup
    ? "Choose a passphrase to lock this backup, or leave both boxes empty for a backup anyone with the file can open, your receipts included: they aren't encrypted inside a backup without a passphrase."
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
