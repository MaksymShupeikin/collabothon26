import type { Metadata } from "next";
import Onboarding from "@/components/Onboarding";

export const metadata: Metadata = { title: "Welcome · comdirect edu" };

export default function StartPage() {
  return <Onboarding />;
}
