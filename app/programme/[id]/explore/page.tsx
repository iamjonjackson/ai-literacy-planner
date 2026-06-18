"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { findDimension, frameworkCompetencies, frameworkDimensions } from "@/lib/framework";
import { usePersistentState } from "@/lib/persistent-state";

const references = [
  {
    label: "UNESCO AI Competency Framework for Students",
    href: "https://www.unesco.org/en/articles/ai-competency-framework-students",
  },
  {
    label:
      "Nicola-Richmond et al. (2026) Implementing a collaborative program-wide approach to redeveloping assessment...",
    href: "https://doi.org/10.1080/02602938.2026.2653886",
  },
  {
    label: "Corbin et al. (2025) The wicked problem of AI and assessment",
    href: "https://doi.org/10.1080/02602938.2025.2553340",
  },
  {
    label: "Corbin, Dawson and Liu (2025) Talk is cheap",
    href: "https://www.tandfonline.com/doi/abs/10.1080/02602938.2025.2503964",
  },
];

type Level = "understand" | "apply" | "create";

export default function ExplorePage() {
  const params = useParams<{ id: string }>();
  const programmeId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("programme") ?? params.id
      : params.id;
  const stateKey = `ai-literacy-planner:explore:${programmeId}`;
  const [search, setSearch] = usePersistentState(`${stateKey}:search`, "");
  const [selectedDimension, setSelectedDimension] = usePersistentState(
    `${stateKey}:dimension`,
    frameworkDimensions[0].id,
  );
  const [selectedCompetencyId, setSelectedCompetencyId] = usePersistentState(
    `${stateKey}:competency`,
    frameworkCompetencies[0].id,
  );
  const [selectedLevel, setSelectedLevel] = usePersistentState<Level>(`${stateKey}:level`, "understand");
  const [showGrid, setShowGrid] = usePersistentState(`${stateKey}:grid`, false);

  const filteredCompetencies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return frameworkCompetencies;
    }

    return frameworkCompetencies.filter((competency) => {
      return (
        competency.title.toLowerCase().includes(query) ||
        competency.id.includes(query) ||
        competency.narrative.toLowerCase().includes(query) ||
        competency.levels.understand.toLowerCase().includes(query) ||
        competency.levels.apply.toLowerCase().includes(query) ||
        competency.levels.create.toLowerCase().includes(query)
      );
    });
  }, [search]);

  const visibleCompetencies = filteredCompetencies.filter(
    (competency) => competency.dimensionId === selectedDimension,
  );

  const selectedCompetency =
    filteredCompetencies.find((competency) => competency.id === selectedCompetencyId) ??
    filteredCompetencies[0] ??
    frameworkCompetencies[0];
  const selectedDimensionRecord = findDimension(selectedCompetency.dimensionId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="min-w-[240px] flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm"
            placeholder="Search competencies and descriptors"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => setShowGrid((current) => !current)}
          >
            {showGrid ? "Show detail" : "Show 4×3 grid"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {frameworkDimensions.map((dimension) => (
            <button
              key={dimension.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                selectedDimension === dimension.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setSelectedDimension(dimension.id)}
            >
              {dimension.label}
            </button>
          ))}
        </div>

        {showGrid ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCompetencies.map((competency) => {
              const dimension = findDimension(competency.dimensionId);
              return (
                <button
                  key={competency.id}
                  type="button"
                  className="rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300"
                  onClick={() => {
                    setSelectedCompetencyId(competency.id);
                    setShowGrid(false);
                    setSelectedDimension(competency.dimensionId);
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{competency.id}</p>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">{competency.title}</h3>
                  <span className={`mt-3 inline-block rounded-full px-2 py-1 text-xs font-semibold ${dimension?.colorClass}`}>
                    {dimension?.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
              {visibleCompetencies.map((competency) => (
                <button
                  key={competency.id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    selectedCompetency.id === competency.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  onClick={() => {
                    setSelectedCompetencyId(competency.id);
                    setSelectedLevel("understand");
                  }}
                >
                  <p className="text-xs text-slate-500">{competency.id}</p>
                  <p className="text-sm font-medium text-slate-900">{competency.title}</p>
                </button>
              ))}
            </div>
            <article className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">{selectedCompetency.id}</p>
                  <h2 className="text-2xl font-semibold text-slate-900">{selectedCompetency.title}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedDimensionRecord?.colorClass}`}>
                  {selectedDimensionRecord?.label}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["understand", "apply", "create"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      selectedLevel === level ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                    onClick={() => setSelectedLevel(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {selectedCompetency.levels[selectedLevel]}
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700">{selectedCompetency.narrative}</p>
            </article>
          </div>
        )}
      </section>
      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">References and reading</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          {references.map((reference) => (
            <li key={reference.href}>
              <a className="text-blue-700 underline" href={reference.href} target="_blank" rel="noreferrer">
                {reference.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
