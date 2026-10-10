// [8i] The ask-first window's behaviour (desktop/encrypt-ask.html). Runs in a sandboxed page with no Node
// and no network; it talks to the app only through `window.dotamiChoice` (desktop/choice-preload.cjs),
// which can send one of this window's four answers and nothing else.
(() => {
  const bridge = window.dotamiChoice;
  const $ = (id) => document.getElementById(id);
  // No data file yet (database-encryption.md § 15.1): the same four buttons, but there is nothing to back up,
  // so Back up first… is shown turned off, with a line saying why (the app refuses that answer from this
  // window too). Nothing is "now" about a first start, and with no data file there is no old file and no copy
  // of it, so the sentence about those is left out.
  if (bridge.mode === "new-folder") {
    $("backup").disabled = true;
    $("backup").setAttribute("aria-describedby", "nothing-to-back-up");
    $("nothing-to-back-up").hidden = false;
    $("now").remove();
    $("earlier-copies").remove();
  }
  if (bridge.status) {
    $("status").textContent = bridge.status;
    $("status").hidden = false;
  }
  const show = (which) => {
    $("ask").hidden = which !== "ask";
    $("confirm-never").hidden = which !== "never";
  };
  $("encrypt").addEventListener("click", () => bridge.answer("encrypt"));
  $("backup").addEventListener("click", () => bridge.answer("backup"));
  $("later").addEventListener("click", () => bridge.answer("not-now"));
  // "Never" asks once more, with what it leaves unprotected, before it is sent.
  $("never").addEventListener("click", () => show("never"));
  $("back").addEventListener("click", () => show("ask"));
  $("never-confirm").addEventListener("click", () => bridge.answer("never"));
  $("encrypt").focus();
})();
