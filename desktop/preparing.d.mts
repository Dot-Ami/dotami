// Types for desktop/preparing.mjs, so the TypeScript tests can import it.

export const PREPARING_TITLE: "Preparing DotAmi…";

export interface ClosableWindow {
  isDestroyed(): boolean;
  destroy(): void;
}

export interface PreparingWindow {
  show(): void;
  close(reason: string): void;
  isOpen(): boolean;
}

export function startWillWait(dataDir: string, platform?: string): boolean;
export function preparingWindow(open: () => ClosableWindow, options?: { log?: (line: string) => void }): PreparingWindow;
export function waitShowingWindow(
  dataDir: string,
  preparing: PreparingWindow,
  options?: { platform?: string; wait?: () => Promise<boolean> },
): () => Promise<boolean>;
