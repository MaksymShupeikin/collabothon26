import type { Metadata } from "next";
import Pro from "@/features/pro/Pro";

export const metadata: Metadata = { title: "Real Market · comdirect edu" };

export default function RealMarketPage() {
  return <Pro realMarket />;
}
