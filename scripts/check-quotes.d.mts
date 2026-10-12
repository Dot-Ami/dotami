// Types for scripts/check-quotes.mjs, so tests/check-quotes.spec.ts type-checks against it.

export interface FetchedPage {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  error?: string;
}

export type FetchPage = (url: string) => Promise<FetchedPage>;

export interface QuoteTarget {
  where: string;
  url: string;
  quotes: string[];
}

export function pageToText(html: string): string;
export function normaliseForMatch(text: string): string;
export function findQuotes(pageText: string, quotes: readonly string[]): { quote: string; found: boolean }[];
export function toolCheckedTargets(
  listed: readonly {
    where: string;
    citation: { url: string; lastVerified?: string; toolCheck?: { checkedOn: string; quotes: readonly string[] } };
  }[],
): QuoteTarget[];
export function main(
  argv: string[],
  options?: {
    fetchPage?: FetchPage;
    collect?: () => Promise<QuoteTarget[]>;
    log?: (line: string) => void;
    today?: string;
  },
): Promise<number>;
