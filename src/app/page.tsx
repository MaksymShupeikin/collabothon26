import HomeSwitch from "@/features/home/HomeSwitch";

// After onboarding, / is the comdirect edu hub (layout from main); before it, / sends you to onboarding (/start).
export default function Home() {
  return <HomeSwitch />;
}
