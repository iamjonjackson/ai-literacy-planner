import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
            UNESCO AI Competency Explorer
          </Link>
          <p className="text-sm text-slate-600">
            Initial application shell for the AI literacy planner.
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <Link className="rounded-full px-3 py-2 hover:bg-slate-100" href="/login">
            Login
          </Link>
          <Link
            className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
