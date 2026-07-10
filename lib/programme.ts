export const demoProgrammeId = "sample-programme";

export const programmeTabs = [
  { slug: "explore", label: "Explore" },
  { slug: "plan", label: "Plan & Scan" },
  { slug: "design", label: "Design" },
  { slug: "map", label: "Map" },
  { slug: "assess", label: "Assess" },
  { slug: "implement", label: "Implement" },
] as const;

export type ProgrammeTab = (typeof programmeTabs)[number]["slug"];

type BuildProgrammeRouteOptions = {
  publicToken?: string | null;
};

export function formatProgrammeName(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildProgrammeRoute(
  id: string,
  tab: ProgrammeTab,
  options?: BuildProgrammeRouteOptions,
) {
  const base = `/programme/${demoProgrammeId}/${tab}`;
  const params = new URLSearchParams();

  if (id !== demoProgrammeId) {
    params.set("programme", id);
  }

  if (options?.publicToken) {
    params.set("publicToken", options.publicToken);
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getStaticProgrammeParams() {
  return [{ id: demoProgrammeId }];
}
