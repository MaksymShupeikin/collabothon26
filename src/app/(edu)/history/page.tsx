import type { Metadata } from "next";
import HistoryMode from "@/features/learn/HistoryMode";

export const metadata: Metadata = { title: "History Mode · comdirect edu" };

export default function HistoryPage() {
  return <HistoryMode />;
}
