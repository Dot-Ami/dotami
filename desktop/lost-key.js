// [8i] The lost-key window's behaviour (desktop/lost-key.html). Runs in a sandboxed page with no Node and
// no network; it talks to the app only through `window.dotamiChoice` (desktop/choice-preload.cjs).
(() => {
  const bridge = window.dotamiChoice;
  const $ = (id) => document.getElementById(id);
  $("why").textContent = bridge.detail;
  $("quit").addEventListener("click", () => bridge.answer("quit"));
  $("open-folder").addEventListener("click", () => bridge.answer("open-folder"));
  $("restore").addEventListener("click", () => bridge.answer("restore"));
  $("quit").focus();
})();
