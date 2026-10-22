// Types for scripts/quality-report.mjs, so tests/quality-report.spec.ts type-checks against it.

export function parseArgs(argv: string[]): { clutterOnly: boolean; line: boolean; live: boolean } | string;
