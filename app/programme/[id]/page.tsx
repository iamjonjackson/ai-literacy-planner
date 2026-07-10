import { redirect } from "next/navigation";
import { buildProgrammeRoute, getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default async function ProgrammeIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ programme?: string; publicToken?: string }>;
}) {
  const { id } = await params;
  const { programme, publicToken } = await searchParams;
  const targetProgrammeId = programme ?? id;
  redirect(buildProgrammeRoute(targetProgrammeId, "explore", { publicToken: publicToken ?? null }));
}
