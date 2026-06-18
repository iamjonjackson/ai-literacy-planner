import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { buildProgrammeRoute, demoProgrammeId } from "@/lib/programme";

const dashboardCards = [
  {
    title: "Sample Programme",
    description: "Starter record for exploring the routed programme workspace.",
    years: 3,
    modules: 0,
    coverage: "0%",
    href: buildProgrammeRoute(demoProgrammeId, "explore"),
  },
];

export default function DashboardPage() {
  return (
    <PageShell>
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Programmes</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            The dashboard shell is ready for programme listing, creation, sharing, and
            import/export workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={buildProgrammeRoute(demoProgrammeId, "explore")}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900"
          >
            Open sample
          </Link>
          <button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            New programme
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {dashboardCards.map((card) => (
          <article
            key={card.title}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Draft
              </span>
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-slate-500">Years</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-900">{card.years}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-slate-500">Modules</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-900">{card.modules}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-slate-500">LO coverage</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-900">{card.coverage}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={card.href}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open
              </Link>
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900">
                Export JSON
              </button>
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
