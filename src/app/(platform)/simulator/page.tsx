import type { Metadata } from "next";
import Simulator from "@/components/Simulator";

export const metadata: Metadata = { title: "Market Simulator · comdirect edu" };

export default function SimulatorPage() {
  return <Simulator />;
}
