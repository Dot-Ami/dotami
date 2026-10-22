// Types for scripts/data-check.mjs, so tests/data-check.spec.ts type-checks against it.

export const IMPORTERS: readonly string[];
export function main(options?: { root?: string; log?: (line: string) => void; importers?: readonly string[] }): Promise<number>;
