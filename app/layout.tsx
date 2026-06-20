import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import SiteHeader from "@/app/components/SiteHeader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    template: "Counciloris - %s",
    default: "Counciloris",
  },
  description:
    "Browse transcripts from city council meetings to stay informed about decisions that affect your community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${newsreader.variable} antialiased`}
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
