"use client";

import { useParams } from "next/navigation";
import { UnescoExplorer } from "@/components/unesco-explorer";

export default function ExplorePage() {
  const params = useParams<{ id: string }>();
  const programmeId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("programme") ?? params.id
      : params.id;

  return <UnescoExplorer stateScope={programmeId} />;
}
