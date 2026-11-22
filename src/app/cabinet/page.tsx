import type { Metadata } from "next";
import Cabinet from "@/features/cabinet/Cabinet";
import { SaveGate } from "@/features/game/store";

export const metadata: Metadata = { title: "Web cabinet · comdirect edu" };

export default function CabinetPage() {
  return <SaveGate><Cabinet /></SaveGate>;
}
