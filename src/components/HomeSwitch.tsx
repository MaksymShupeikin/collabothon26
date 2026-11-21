"use client";
import { useSyncExternalStore } from "react";
import { useGame } from "@/lib/game/store";
import ComdirectHome from "./ComdirectHome";
import Header from "./Header";
import LearningMap from "./LearningMap";

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
