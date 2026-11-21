import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

// Geometric sans close to comdirect's Gotham (which is licensed and not shipped here). One family for all UI.
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "comdirect edu",
  description: "Practice first, then invest — learn investing in a safe comdirect simulator.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
