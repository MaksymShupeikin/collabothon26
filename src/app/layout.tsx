import type { Metadata } from "next";
import "@/app/globals.css";
import XpGain from "@/features/game/XpGain";
import McpNotice from "@/features/mcp/McpNotice";
import { LangSync } from "@/features/shell/LangSwitch";

export const metadata: Metadata = {
  title: "comdirect edu",
  description: "Practice first, then invest: a training sandbox that looks like comdirect and runs on play money.",
};

// Runs before paint: with German stored (key from shared/lib/i18n.ts), hide the page until it has rendered in German, so English never flashes.
const LANG_BOOT = `try{if(localStorage.getItem("cd-edu-lang")==="de"){var h=document.documentElement;h.lang="de";h.classList.add("i18n-wait");setTimeout(function(){h.classList.remove("i18n-wait")},1500)}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script may set lang="de" before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body>
        {children}
        <XpGain />
        <McpNotice />
        <LangSync />
      </body>
    </html>
  );
}
