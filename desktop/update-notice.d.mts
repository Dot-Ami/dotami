// Types for desktop/update-notice.mjs, so the TypeScript tests can import it.
import type { EventEmitter } from "node:events";

export interface MessageBoxOptions {
  type?: string;
  title?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
  message: string;
  detail?: string;
  signal?: AbortSignal;
}

export function showUpdateProgress(parts: {
  updater: EventEmitter & { quitAndInstall: () => void };
  dialog: {
    showMessageBox(...args: [MessageBoxOptions] | [unknown, MessageBoxOptions]): Promise<{ response: number; checkboxChecked?: boolean }>;
  };
  window: () => { setProgressBar(value: number): void; isDestroyed(): boolean } | null;
  log: (line: string) => void;
}): void;
