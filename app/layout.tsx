import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted, committed to the repo (app/fonts, SIL Open Font License): no request leaves the
// machine for a font, at build time or at run time. The previous @import in globals.css
// fetched them from Google on every page view.
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/JetBrainsMono-Regular.woff2", weight: "400" },
    { path: "./fonts/JetBrainsMono-Medium.woff2", weight: "500" },
    { path: "./fonts/JetBrainsMono-SemiBold.woff2", weight: "600" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-[13px] leading-snug text-paper antialiased">
        {children}
      </body>
    </html>
  );
}
