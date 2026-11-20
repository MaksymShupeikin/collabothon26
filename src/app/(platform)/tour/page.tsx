import type { Metadata } from "next";
import Simulator from "@/components/Simulator";

export const metadata: Metadata = { title: "Tour · comdirect edu" };

// The tour runs on the real simulator screen, so users learn the exact interface they'll use.
export default function TourPage() {
  return <Simulator tour />;
}
