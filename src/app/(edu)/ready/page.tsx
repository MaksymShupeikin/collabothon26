import type { Metadata } from "next";
import Ready from "@/features/onboarding/Ready";

export const metadata: Metadata = { title: "Ready for real? · comdirect edu" };

export default function ReadyPage() {
  return <Ready />;
}
