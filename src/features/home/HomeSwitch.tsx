"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/features/game/store";
import Header from "@/features/shell/Header";
import LearningMap from "@/features/learn/LearningMap";

const noop = () => () => {};

/** Progress lives in localStorage, so the choice between hub and onboarding waits for the client (no flash of the wrong page). */
export default function HomeSwitch() {
  const save = useGame();
  const router = useRouter();
  const client = useSyncExternalStore(noop, () => true, () => false);
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
