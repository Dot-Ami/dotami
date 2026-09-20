import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DotAmi",
  description:
    "Every path to financial freedom, mapped step by step and cited to the law. Canada is the first jurisdiction mapped.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink font-sans text-[13px] leading-snug text-paper antialiased">
        {children}
        <footer className="border-t border-rule-soft px-8 py-4 text-center text-[11px] text-stone-dim md:px-14">
          Information, not legal or tax advice · a prep tool for you and your accountant ·{" "}
          <a
            href="https://github.com/Dot-Ami/dotami"
            target="_blank"
            rel="noreferrer"
            className="text-stone underline decoration-stone-dim underline-offset-2 hover:text-paper"
          >
            open source on GitHub
          </a>
        </footer>
      </body>
    </html>
  );
}
