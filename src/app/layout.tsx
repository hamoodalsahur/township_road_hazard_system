import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/product";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | Prototype`,
  description: `${PRODUCT_TAGLINE}. A prototype with fictional data, not live road conditions.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
