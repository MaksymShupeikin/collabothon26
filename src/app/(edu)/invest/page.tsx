import type { Metadata } from "next";
import InvestorSim from "@/features/invsim/InvestorSim";

export const metadata: Metadata = { title: "Investor Simulator · comdirect edu" };

export default function InvestPage() {
  return <InvestorSim />;
}
