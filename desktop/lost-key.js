// [8i] The lost-key window's behaviour (desktop/lost-key.html). Runs in a sandboxed page with no Node and
// no network; it talks to the app only through `window.dotamiChoice` (desktop/choice-preload.cjs).
(() => {
  const bridge = window.dotamiChoice;
  const $ = (id) => document.getElementById(id);
  $("why").textContent = bridge.detail;
  $("quit").addEventListener("click", () => bridge.answer("quit"));
  $("open-folder").addEventListener("click", () => bridge.answer("open-folder"));
  $("restore").addEventListener("click", () => bridge.answer("restore"));
  // "Start fresh" asks once more, saying what is given up, before it is sent.
  const show = (which) => {
    $("lost").hidden = which !== "lost";
    $("confirm-fresh").hidden = which !== "fresh";
  };
  $("start-fresh").addEventListener("click", () => show("fresh"));
  $("back").addEventListener("click", () => show("lost"));
  $("fresh-confirm").addEventListener("click", () => bridge.answer("start-fresh"));
  $("quit").focus();
})();
