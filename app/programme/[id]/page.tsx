import { redirect } from "next/navigation";
import { buildProgrammeRoute, getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default async function ProgrammeIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(buildProgrammeRoute(id, "explore"));
}
