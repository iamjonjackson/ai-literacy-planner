import { ProgrammeTabPage } from "@/components/programme-tab-page";
import { getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default function MapPage() {
  return (
    <ProgrammeTabPage
      eyebrow="Tab 4"
      title="Map learning outcomes to modules"
      description="This route sets up the dedicated mapping workspace for drag-and-drop assignment, CSV import, and module coverage tracking."
      highlights={[
        "Build the module grid alongside grouped learning outcomes.",
        "Add CSV preview/import flow and import summaries.",
        "Support LO-to-module mapping interactions and reset safeguards.",
      ]}
      asideTitle="Build focus"
      asideBody={
        <>
          <p>This tab will evolve into the main structure and mapping interface.</p>
          <p>It is separated from the plan shell so the two workflows can mature independently.</p>
        </>
      }
    />
  );
}
