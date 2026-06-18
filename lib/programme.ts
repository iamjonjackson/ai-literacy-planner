export const demoProgrammeId = "sample-programme";

export const programmeTabs = [
  { slug: "explore", label: "Explore" },
  { slug: "design", label: "Design" },
  { slug: "plan", label: "Plan" },
  { slug: "map", label: "Map" },
  { slug: "assess", label: "Assess" },
  { slug: "implement", label: "Implement" },
] as const;

export type ProgrammeTab = (typeof programmeTabs)[number]["slug"];

export function formatProgrammeName(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildProgrammeRoute(id: string, tab: ProgrammeTab) {
  return `/programme/${id}/${tab}`;
}

export function getStaticProgrammeParams() {
  return [{ id: demoProgrammeId }];
}
