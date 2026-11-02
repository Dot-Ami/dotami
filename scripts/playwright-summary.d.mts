// Types for scripts/playwright-summary.mjs, so tests/playwright-summary.spec.ts type-checks against it.

export type SummaryTest = {
  where: string;
  title: string;
  status: string;
  results: {
    retry: number;
    status: string;
    error?: { message?: string };
    errors?: { message?: string }[];
  }[];
};

export function testsIn(report: unknown, options?: { cwd?: string }): SummaryTest[];

export function summarize(
  report: unknown,
  options?: { title?: string; artifact?: string },
): {
  passed: number;
  flaky: number;
  failed: number;
  skipped: number;
  flakyTests: SummaryTest[];
  markdown: string;
};

export function warningFor(test: SummaryTest): string;

export function main(
  argv: string[],
  options?: { env?: Record<string, string | undefined>; log?: (line: string) => void },
): number;
