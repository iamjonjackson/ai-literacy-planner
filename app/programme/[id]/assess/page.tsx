import { ProgrammeTabPage } from "@/components/programme-tab-page";
import { getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default function AssessPage() {
  return (
    <ProgrammeTabPage
      eyebrow="Tab 5"
      title="Assess module assessment design"
      description="This route is prepared for assessment authoring, RAG ratings, priority ratings, and programme-wide assessment summaries."
      highlights={[
        "Add expandable module cards with assessment lists.",
        "Build the assessment form and linked learning outcome selection.",
        "Surface priority and RAG summaries at the top of the tab.",
      ]}
      asideTitle="Status"
      asideBody={
        <>
          <p>The page currently communicates intent while the data model is being assembled.</p>
          <p>It will plug into the same programme shell and navigation already in place.</p>
        </>
      }
    />
  );
}
