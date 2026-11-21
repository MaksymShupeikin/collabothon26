import { redirect } from "next/navigation";

// The hub moved to /.
export default function LearnPage() {
  redirect("/");
}
