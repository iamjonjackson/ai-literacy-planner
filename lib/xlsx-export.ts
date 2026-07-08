import * as XLSX from "xlsx";
import { frameworkCompetencies } from "@/lib/framework";
import type { Programme, Module, LearningOutcome, Assessment } from "@/lib/app-data";

type ExportData = {
  programme: Programme;
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

function safeFilename(name: string) {
  return name.replaceAll(/[^\w\s-]/g, "").replaceAll(/\s+/g, "-").toLowerCase();
}

function makeSheet<T extends Record<string, unknown>>(rows: T[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows);
}

function programmeOverviewRows(data: ExportData) {
  const { programme, modules, learningOutcomes, assessments } = data;
  const mapped = learningOutcomes.filter((lo) => lo.moduleId).length;
  const competenciesCovered = new Set(
    learningOutcomes.filter((lo) => lo.competencyId).map((lo) => lo.competencyId),
  ).size;

  return [
    { Field: "Programme name", Value: programme.name },
    { Field: "Description", Value: programme.description || "" },
    { Field: "Years", Value: programme.years },
    { Field: "Modules", Value: modules.length },
    { Field: "Learning Outcomes", Value: learningOutcomes.length },
    { Field: "LOs mapped", Value: mapped },
    { Field: "LO mapping %", Value: learningOutcomes.length ? Math.round((mapped / learningOutcomes.length) * 100) : 0 },
    { Field: "Competencies covered", Value: competenciesCovered },
    { Field: "Total competencies", Value: 12 },
    { Field: "Assessments", Value: assessments.length },
  ];
}

function coverageStatsRows(data: ExportData) {
  const { assessments } = data;
  const ragCounts: Record<string, number> = { Red: 0, Amber: 0, Green: 0, Unrated: 0 };
  const priorityCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0, "None set": 0 };

  for (const a of assessments) {
    if (a.rag) ragCounts[a.rag]++;
    else ragCounts["Unrated"]++;
    if (a.priority) priorityCounts[a.priority]++;
    else priorityCounts["None set"]++;
  }

  return [
    ...Object.entries(ragCounts).map(([status, count]) => ({
      Category: "AI and Assessment taxonomy",
      Label: status,
      Count: count,
    })),
    ...Object.entries(priorityCounts).map(([level, count]) => ({
      Category: "Priority Rating",
      Label: level,
      Count: count,
    })),
  ];
}

function assessmentSummaryRows(data: ExportData) {
  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));
  return data.assessments.map((a) => {
    const mod = moduleMap.get(a.moduleId);
    return {
      "Assessment Code": a.assessmentCode || "",
      "Assessment Title": a.title,
      "Weight": a.weight || "",
      Duration: a.duration || "",
      Priority: a.priority || "",
      "AI and Assessment taxonomy": a.rag || "",
      Module: mod?.name || "",
      "Module Code": mod?.code || "",
      "Year": mod?.year ?? "",
    };
  });
}

function allLosRows(data: ExportData) {
  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));
  return data.learningOutcomes.map((lo) => {
    const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
    const mod = lo.moduleId ? moduleMap.get(lo.moduleId) : undefined;
    return {
      "LO Text": lo.text,
      "Competency ID": comp?.id || "",
      "Competency Title": comp?.title || "",
      "Imported Category": lo.category || "",
      "Module": mod?.name || "Unmapped",
      "Module Code": mod?.code || "",
      "Year": mod?.year ?? "",
    };
  });
}

function moduleListRows(data: ExportData) {
  const { modules, learningOutcomes, assessments } = data;
  return [...modules]
    .sort((a, b) => a.year - b.year || a.order - b.order)
    .map((m) => ({
      Year: m.year,
      Name: m.name,
      Code: m.code || "",
      Credits: m.credits || "",
      Compulsory: m.isCompulsory ? "Yes" : "No",
      Scheme: m.scheme || "",
      Organiser: m.organiser || "",
      "LO Count": learningOutcomes.filter((lo) => lo.moduleId === m.id).length,
      "Assessment Count": assessments.filter((a) => a.moduleId === m.id).length,
      URL: m.url || "",
    }));
}

function coverageMatrixRows(data: ExportData) {
  const { modules, learningOutcomes } = data;
  const sortedModules = [...modules].sort((a, b) => a.year - b.year || a.order - b.order);

  return frameworkCompetencies.map((comp) => {
    const row: Record<string, unknown> = {
      "Competency ID": comp.id,
      "Competency Title": comp.title,
      "LO Count": learningOutcomes.filter((lo) => lo.competencyId === comp.id).length,
    };
    for (const mod of sortedModules) {
      const covered = learningOutcomes.some(
        (lo) => lo.competencyId === comp.id && lo.moduleId === mod.id,
      );
      row[`${mod.code || mod.name} (Y${mod.year})`] = covered ? "✓" : "";
    }
    return row;
  });
}

export function downloadSummaryXlsx(data: ExportData) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, makeSheet(programmeOverviewRows(data)), "Programme Overview");
  XLSX.utils.book_append_sheet(wb, makeSheet(coverageStatsRows(data)), "Coverage Stats");
  XLSX.utils.book_append_sheet(wb, makeSheet(assessmentSummaryRows(data)), "Assessment Summary");

  const datePart = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeFilename(data.programme.name)}-summary-${datePart}.xlsx`);
}

export function downloadFullDetailXlsx(data: ExportData) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, makeSheet(programmeOverviewRows(data)), "Programme Info");
  XLSX.utils.book_append_sheet(wb, makeSheet(allLosRows(data)), "All LOs");
  XLSX.utils.book_append_sheet(wb, makeSheet(moduleListRows(data)), "Module List");
  XLSX.utils.book_append_sheet(wb, makeSheet(assessmentSummaryRows(data)), "Assessments");
  XLSX.utils.book_append_sheet(wb, makeSheet(coverageMatrixRows(data)), "Coverage Matrix");

  const datePart = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeFilename(data.programme.name)}-full-detail-${datePart}.xlsx`);
}
