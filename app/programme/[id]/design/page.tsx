import { ProgrammeTabPage } from "@/components/programme-tab-page";
import { getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default function DesignPage() {
  return (
    <ProgrammeTabPage
      eyebrow="Tab 2"
      title="Design programme learning outcomes"
      description="This route establishes the workspace for competency-linked learning outcomes, coverage tracking, and imported unassigned outcomes."
      highlights={[
        "Add programme and competency data stores.",
        "Build the learning outcome editor and coverage progress bar.",
        "Support unassigned imported outcomes and reordering interactions.",
      ]}
      asideTitle="Implementation notes"
      asideBody={
        <>
          <p>The shell anticipates a left competency list and a right editing panel.</p>
          <p>Editing is intentionally deferred until the backing state model exists.</p>
        </>
      }
    />
  );
}
