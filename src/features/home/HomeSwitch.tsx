"use client";
import { useSyncExternalStore } from "react";
import { useGame } from "@/features/game/store";
import ComdirectHome from "@/features/home/ComdirectHome";
import Header from "@/features/shell/Header";
import LearningMap from "@/features/learn/LearningMap";

const noop = () => () => {};

/** Progress lives in localStorage, so the choice between hub and comdirect page waits for the client (no flash of the wrong page). */
export default function HomeSwitch() {
  const save = useGame();
  const client = useSyncExternalStore(noop, () => true, () => false);
  if (!client) return null;
  if (!save.persona) return <ComdirectHome />;
  return (
    <>
      <Header />
      <LearningMap />
    </>
  );
}
