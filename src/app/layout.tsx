import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

const title = site.name ? `${site.name}: ${site.title}` : site.title;

export const metadata: Metadata = {
  title,
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#e9e5df",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${instrumentSerif.variable} antialiased`}>
      <body className="min-h-svh">{children}</body>
    </html>
  );
}
