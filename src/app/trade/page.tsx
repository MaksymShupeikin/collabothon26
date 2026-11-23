import type { Metadata } from "next";
import Pro from "@/features/pro/Pro";
import { SaveGate } from "@/features/game/store";

export const metadata: Metadata = { title: "Trading area · comdirect edu" };

export default function TradePage() {
  return <SaveGate><Pro /></SaveGate>;
}
