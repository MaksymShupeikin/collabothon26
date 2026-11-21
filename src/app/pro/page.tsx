import type { Metadata } from "next";
import Pro from "@/features/pro/Pro";

export const metadata: Metadata = { title: "Pro mode · comdirect edu" };

export default function ProPage() {
  return <Pro />;
}
