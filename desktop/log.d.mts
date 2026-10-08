// Types for desktop/log.mjs, so the TypeScript tests can import it.
export interface DesktopLog {
  file: string;
  write(text: string | Uint8Array): void;
  follow(stream: NodeJS.ReadableStream | null | undefined): void;
}

export function openLog(file: string): DesktopLog;

export function describeError(error: unknown): string;
