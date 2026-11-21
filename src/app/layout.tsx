import type { Metadata } from "next";
import "@/app/globals.css";
import XpGain from "@/features/game/XpGain";

export const metadata: Metadata = {
  title: "comdirect edu",
  description: "Practice first, then invest: a training sandbox that looks like comdirect and runs on play money.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        {children}
        <XpGain />
      </body>
    </html>
  );
}
