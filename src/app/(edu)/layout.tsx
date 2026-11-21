import Header from "@/components/Header";

// Our own pages (onboarding, learning map, "ready for real"): comdirect edu header.
export default function EduLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
