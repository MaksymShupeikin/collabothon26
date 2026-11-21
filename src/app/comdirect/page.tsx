import type { Metadata } from "next";
import ComdirectHome from "@/components/ComdirectHome";

export const metadata: Metadata = { title: "Personal area · comdirect" };

// The mocked comdirect start page, always reachable for the demo.
export default function ComdirectPage() {
  return <ComdirectHome />;
}
