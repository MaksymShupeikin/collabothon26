import type { Metadata } from "next";
import Ready from "@/features/onboarding/Ready";
import { SaveGate } from "@/features/game/store";

export const metadata: Metadata = { title: "Ready for real? · comdirect edu" };

export default function ReadyPage() {
  return <SaveGate><Ready /></SaveGate>;
}
