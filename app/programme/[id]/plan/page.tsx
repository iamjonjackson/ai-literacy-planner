import { ProgrammeTabPage } from "@/components/programme-tab-page";
import { getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default function PlanPage() {
  return (
    <ProgrammeTabPage
      eyebrow="Tab 3"
      title="Plan the programme structure"
      description="This route reserves space for year-by-year programme planning and initial module structure editing."
      highlights={[
        "Introduce year rows and module cards.",
        "Add the create, edit, delete, and reorder flows for modules.",
        "Prepare the toolbar actions for adding years and importing structure data.",
      ]}
      asideTitle="Why this tab exists"
      asideBody={
        <>
          <p>The specification includes a dedicated plan route in the primary tab bar.</p>
          <p>This shell keeps that route available while mapping interactions are built out.</p>
        </>
      }
    />
  );
}
