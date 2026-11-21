import type { Metadata } from "next";
import LearningMap from "@/components/LearningMap";

export const metadata: Metadata = { title: "Learning map · comdirect edu" };

export default function LearnPage() {
  return <LearningMap />;
}
