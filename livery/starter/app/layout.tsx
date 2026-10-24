import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Fraunces carries titles only; its optical-size axis follows the font size (thin, high-contrast cut at hero size,
// sturdier at 16px card titles). Source Sans 3 carries everything else.
const display = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces" });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans" });

export const metadata: Metadata = { title: "Warm paper starter", description: "Livery starter — Pocket Clone design system" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
