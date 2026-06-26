import { Footer } from "@/components/footer";
import { UnescoExplorer } from "@/components/unesco-explorer";

export default function PublicExplorePage() {
  return (
    <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">UNESCO AI Competency Explorer</h1>
        <p className="text-sm text-slate-600 mb-4">
          Browse the UNESCO student AI competency framework, including dimensions, competencies, and performance
          levels.
        </p>
      </div>
      <UnescoExplorer stateScope="public" />
      <Footer />
    </div>
  );
}
