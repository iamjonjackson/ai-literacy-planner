import { ProgrammeTabPage } from "@/components/programme-tab-page";
import { getStaticProgrammeParams } from "@/lib/programme";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticProgrammeParams();
}

export default function ExplorePage() {
  return (
    <ProgrammeTabPage
      eyebrow="Tab 1"
      title="Explore the UNESCO competency framework"
      description="This route is ready for the searchable framework explorer, references panel, and competency detail views described in the specification."
      highlights={[
        "Add the compiled framework content feed from markdown under /content.",
        "Build the dimension list, competency cards, and level tabs.",
        "Introduce fuzzy search and the references/reading panel.",
      ]}
      asideTitle="What is included now"
      asideBody={
        <>
          <p>The route structure, shared layout, and section shell are in place.</p>
          <p>Next steps are wiring content loading and the two-panel explore experience.</p>
        </>
      }
    />
  );
}
