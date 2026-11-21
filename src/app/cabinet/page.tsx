import type { Metadata } from "next";
import Cabinet from "@/components/cabinet/Cabinet";

export const metadata: Metadata = { title: "Web cabinet · comdirect edu" };

export default function CabinetPage() {
  return <Cabinet />;
}
