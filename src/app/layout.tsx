import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Fraunces carries titles only (its optical size follows the font size); Source Sans 3 carries everything else.
const display = Fraunces({ subsets: ["latin", "latin-ext"], axes: ["opsz"], variable: "--font-fraunces" });
const body = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-source-sans" });

export const metadata: Metadata = {
  title: "Pocket Clone",
  description: "Save links for later",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
