"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame, useLoaded } from "@/features/game/store";
import Header from "@/features/shell/Header";
import LearningMap from "@/features/learn/LearningMap";

/** Progress comes from the server, so the choice between hub and onboarding waits for it (no flash of the wrong page). */
export default function HomeSwitch() {
  const save = useGame();
  const router = useRouter();
  const client = useLoaded();
  useEffect(() => {
    if (client && !save.persona) router.replace("/start");
  }, [client, save.persona, router]);
  if (!client || !save.persona) return null;
  return (
    <>
      <Header />
      <LearningMap />
    </>
  );
}
