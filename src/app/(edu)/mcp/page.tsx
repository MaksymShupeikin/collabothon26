import type { Metadata } from "next";
import McpConnect from "@/features/mcp/McpConnect";

export const metadata: Metadata = { title: "AI Agent (MCP) · comdirect edu" };

export default function McpPage() {
  return <McpConnect />;
}
