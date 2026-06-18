import { ProgrammeTabPage } from "@/components/programme-tab-page";
import { getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default function ImplementPage() {
  return (
    <ProgrammeTabPage
      eyebrow="Tab 6"
      title="Implement exports and backups"
      description="This route forms the export workspace for PDF, XLSX, and JSON backup/restore flows."
      highlights={[
        "Add summary and full-detail export actions.",
        "Prepare the JSON backup and restore preview flow.",
        "Connect the export surface to real programme, module, and assessment data.",
      ]}
      asideTitle="Current behaviour"
      asideBody={
        <>
          <p>The initial shell provides the final tab destination and shared programme context.</p>
          <p>Export tooling will be added once the persisted data model is in place.</p>
        </>
      }
    />
  );
}
