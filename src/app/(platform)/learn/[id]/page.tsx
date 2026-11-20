import { notFound } from "next/navigation";
import { Suspense } from "react";
import ConceptQuest from "@/components/ConceptQuest";
import { CONCEPTS, conceptById } from "@/lib/data/concepts";

export const generateStaticParams = () => CONCEPTS.map((c) => ({ id: c.id }));

async function Quest({ params }: { params: PageProps<"/learn/[id]">["params"] }) {
  const { id } = await params;
  const concept = conceptById(id);
  if (!concept) notFound();
  return <ConceptQuest key={concept.id} concept={concept} />;
}

// params are URL data: keep them inside Suspense so navigation stays instant (Next 16 cache components).
export default function LearnPage(props: PageProps<"/learn/[id]">) {
  return (
    <Suspense fallback={<div className="container muted">Loading…</div>}>
      <Quest params={props.params} />
    </Suspense>
  );
}
