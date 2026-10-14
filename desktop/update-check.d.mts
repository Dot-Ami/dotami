// Types for desktop/update-check.mjs, so the TypeScript tests can import it.

export function mainWindowGate(): { whenShown(fn: () => void): void; open(): void };

export function checkForUpdates(parts: {
  on: boolean;
  byHand: boolean;
  loadUpdater: () => Promise<{ checkForUpdates: () => Promise<{ isUpdateAvailable?: boolean } | null | undefined> }>;
  dialog: { showMessageBox(options: { type?: string; title?: string; message: string; detail?: string }): Promise<unknown> };
  log: (line: string) => void;
  version: string;
}): Promise<void>;
