import { ReactNode } from "react";

type ProgrammeTabPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  asideTitle: string;
  asideBody: ReactNode;
};

export function ProgrammeTabPage({
  eyebrow,
  title,
  description,
  highlights,
  asideTitle,
  asideBody,
}: ProgrammeTabPageProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Initial build targets
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex gap-3">
                <span className="mt-1 text-blue-600">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{asideTitle}</h3>
        <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">{asideBody}</div>
      </aside>
    </div>
  );
}
