import type { Metadata } from "next";
import Cabinet from "@/features/cabinet/Cabinet";

export const metadata: Metadata = { title: "Web cabinet · comdirect edu" };

export default function CabinetPage() {
  return <Cabinet />;
}
