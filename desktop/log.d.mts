// Types for desktop/log.mjs, so the TypeScript tests can import it.
export interface DesktopLog {
  file: string;
  write(text: string | Uint8Array): void;
  follow(stream: NodeJS.ReadableStream | null | undefined): void;
}

export function openLog(file: string): DesktopLog;

export function describeError(error: unknown): string;

export interface UpdaterLogger {
  info(message?: unknown): void;
  warn(message?: unknown): void;
  error(message?: unknown): void;
  debug(message?: unknown): void;
}

export function updaterLogger(write: (text: string) => void): UpdaterLogger;
