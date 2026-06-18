import { redirect } from "next/navigation";
import { buildProgrammeRoute } from "@/lib/programme";

export default async function ProgrammeIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(buildProgrammeRoute(id, "explore"));
}
