import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { DemoBanner } from "@/components/demo-banner";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Civic Trace (prototype, demo data)", template: "%s · Civic Trace (demo)" },
  description:
    "Local prototype of a public-interest investigation and civic-action tool. All content is invented demo data.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render every page per request, so middleware.ts's per-request CSP nonce reaches Next's scripts.
  await connection();
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-[var(--color-card)] focus:p-2"
        >
          Skip to content
        </a>
        <DemoBanner />
        <header className="border-b border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="font-semibold text-[var(--color-ink)] no-underline">
              Civic Trace <span className="font-normal text-[var(--color-muted)]">· prototype</span>
            </Link>
            <nav aria-label="Site" className="flex gap-4 text-sm">
              <Link href="/">Find an issue</Link>
              <Link href="/method">How this works</Link>
              <Link href="/api/v0">API</Link>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto max-w-5xl border-t border-[var(--color-line)] px-4 py-6 text-sm text-[var(--color-muted)]">
          <p>
            Not legal, scientific or medical advice. This prototype explains public processes and
            evidence; it never sends, files or publishes anything for you.
          </p>
        </footer>
      </body>
    </html>
  );
}
