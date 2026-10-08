/**
 * Hands the person a file made in the page: a calendar file, a playbook, later the tax sheet's
 * CSV. Nothing is sent anywhere — the text becomes a blob in the page and the browser saves it.
 *
 * In a browser this is an ordinary download (where it lands is the browser's own setting). In the
 * desktop app, desktop/main.mjs catches the download and asks where to save it with a Save dialog;
 * it never writes a file without asking.
 *
 * Browser only: call it from a click handler.
 */
export function saveTextFile(fileName: string, mimeType: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  // Some browsers ignore a click on a link that isn't in the page.
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Released later rather than at once: the browser may still be reading the blob after click()
  // returns (and the desktop app's Save dialog holds the download until the person answers).
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
