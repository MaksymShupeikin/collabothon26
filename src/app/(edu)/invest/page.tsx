import type { Metadata } from "next";
import InvestorSim from "@/features/invsim/InvestorSim";
import { SaveGate } from "@/features/game/store";

export const metadata: Metadata = { title: "Investor Simulator · comdirect edu" };

export default function InvestPage() {
  return <SaveGate><InvestorSim /></SaveGate>;
}
