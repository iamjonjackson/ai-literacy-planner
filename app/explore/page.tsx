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
      <p className="text-sm m-4">
          Built by <a className="!text-blue-500 !hover:text-blue-700 " href="https://github.com/iamjonjackson" target="_blank" rel="noopener noreferrer">
            iamjonjackson
          </a> and GitHub Copilot as part of the <a className="!text-blue-500 !hover:text-blue-700 " href="https://www.qmul.ac.uk/queenmaryacademy/educators/innovation-and-scholarship/innovative-pedagogies/centre-for-excellence-in-ai-in-education/" target="_blank" rel="noopener noreferrer">
            QMUL Centre for Excellence in AI in Education
          </a>
        </p>
    </div>
  );
}
