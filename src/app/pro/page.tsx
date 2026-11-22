import type { Metadata } from "next";
import Pro from "@/features/pro/Pro";
import { SaveGate } from "@/features/game/store";

export const metadata: Metadata = { title: "Pro mode · comdirect edu" };

export default function ProPage() {
  return <SaveGate><Pro /></SaveGate>;
}
