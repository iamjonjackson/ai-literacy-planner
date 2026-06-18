import type { ReactNode } from "react";
import { ProgrammeShell } from "@/components/programme-shell";

export default async function ProgrammeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ProgrammeShell programmeId={id}>{children}</ProgrammeShell>;
}
