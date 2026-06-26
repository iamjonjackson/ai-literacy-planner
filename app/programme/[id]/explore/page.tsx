"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { UnescoExplorer } from "@/components/unesco-explorer";

function ExplorePageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const programmeId = searchParams.get("programme") ?? params.id;

  return <UnescoExplorer stateScope={programmeId} />;
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageContent />
    </Suspense>
  );
}
