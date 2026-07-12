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

// Helper to get app origin for URL
function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

// Helper to create styled cell for coloring
function styledCell(value: unknown, style: { fill: { fgColor: { rgb: string } }; font: { color: { rgb: string } } }): XLSX.CellObject {
  return {
    t: typeof value === 'number' ? 'n' : 's',
    v: value,
    s: style,
  };
}

// Style definitions
const priorityStyles = {
  High: { fill: { fgColor: { rgb: "374151" } }, font: { color: { rgb: "FFFFFF" } } },
  Medium: { fill: { fgColor: { rgb: "6B7280" } }, font: { color: { rgb: "FFFFFF" } } },
  Low: { fill: { fgColor: { rgb: "E5E7EB" } }, font: { color: { rgb: "1F2937" } } },
};

const ragStyles = {
  Red: { fill: { fgColor: { rgb: "FEE2E2" } }, font: { color: { rgb: "991B1B" } } },
  Amber: { fill: { fgColor: { rgb: "FDE68A" } }, font: { color: { rgb: "92400E" } } },
  Green: { fill: { fgColor: { rgb: "D1FAE5" } }, font: { color: { rgb: "065F46" } } },
};

function programmeOverviewRows(data: ExportData) {
  const { programme, modules, learningOutcomes, assessments } = data;
  const newLearningOutcomes = learningOutcomes.filter((lo) => lo.competencyId !== null).length;
  const assessmentsBeingReviewed = assessments.filter(
    (a) => a.priority !== null && a.priority !== ""
  ).length;
  const newLosOnly = learningOutcomes.filter((lo) => lo.competencyId !== null);
  const mapped = newLosOnly.filter((lo) => lo.moduleId).length;
  const competenciesCovered = new Set(
    newLosOnly.map((lo) => lo.competencyId),
  ).size;

  // Two-column layout
  const leftColumn = [
    { "Programme name": programme.name },
    { "Description": programme.description || "" },
    { "Years": programme.years },
    { "Modules": modules.length },
    { "Learning Outcomes": newLosOnly.length },
    { "Competencies covered": competenciesCovered },
  ];

  const rightColumn = [
    { "LOs mapped": mapped },
    { "LO mapping %": newLosOnly.length ? Math.round((mapped / newLosOnly.length) * 100) : 0 },
    { "Total competencies": 12 },
    { "Assessments": assessments.length },
    { "New Learning Outcomes": newLearningOutcomes },
    { "Assessments being reviewed": assessmentsBeingReviewed },
  ];

  // Merge into two-column rows
  const rows: Record<string, unknown>[] = [];
  const maxRows = Math.max(leftColumn.length, rightColumn.length);
  
  for (let i = 0; i < maxRows; i++) {
    const row: Record<string, unknown> = {};
    if (leftColumn[i]) {
      Object.assign(row, leftColumn[i]);
    }
    if (rightColumn[i]) {
      Object.assign(row, rightColumn[i]);
    }
    rows.push(row);
  }
  
  return rows;
}

function coverageStatsRows(data: ExportData) {
  const { assessments } = data;
  const ragCounts: Record<string, number> = { Red: 0, Amber: 0, Green: 0, Unrated: 0 };
  const priorityCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0, "None set": 0 };
  const totalAssessments = assessments.length;

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
      Percentage: totalAssessments ? Math.round((count / totalAssessments) * 100) : 0,
    })),
    ...Object.entries(priorityCounts).map(([level, count]) => ({
      Category: "Priority Rating",
      Label: level,
      Count: count,
      Percentage: totalAssessments ? Math.round((count / totalAssessments) * 100) : 0,
    })),
  ];
}

function assessmentSummaryRows(data: ExportData): XLSX.WorkSheet {
  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));
  
  // Sort by priority then RAG
  const priorityOrder = { High: 0, Medium: 1, Low: 2, "": 3 };
  const ragOrder = { Red: 0, Amber: 1, Green: 2, "": 3 };
  
  const sortedAssessments = [...data.assessments].sort((a, b) => {
    const aPriority = a.priority ?? "";
    const bPriority = b.priority ?? "";
    const priorityDiff = (priorityOrder as Record<string, number>)[aPriority] - (priorityOrder as Record<string, number>)[bPriority];
    if (priorityDiff !== 0) return priorityDiff;
    
    const aRag = a.rag ?? "";
    const bRag = b.rag ?? "";
    return (ragOrder as Record<string, number>)[aRag] - (ragOrder as Record<string, number>)[bRag];
  });
  
  // Build array of arrays with styling
  const headers = [
    "Assessment Code", "Assessment Title", "Weight", "Duration", 
    "Priority", "AI and Assessment taxonomy", "Module", "Module Code", "Year"
  ];
  
  const aoa: any[][] = [];
  aoa.push(headers.map(h => ({ t: "s", v: h })));
  
  sortedAssessments.forEach((a) => {
    const mod = moduleMap.get(a.moduleId);
    const rowData = [
      a.assessmentCode || "",
      a.title,
      a.weight || "",
      a.duration || "",
      a.priority || "",
      a.rag || "",
      mod?.name || "",
      mod?.code || "",
      mod?.year ?? "",
    ];
    
    const styledRow = rowData.map((value, colIdx) => {
      const cell: XLSX.CellObject = { t: typeof value === 'number' ? 'n' : 's', v: value };
      
      // Priority column (index 4)
      if (colIdx === 4 && value && (priorityStyles as Record<string, any>)[value]) {
        cell.s = (priorityStyles as Record<string, any>)[value];
      }
      
      // RAG column (index 5)
      if (colIdx === 5 && value && (ragStyles as Record<string, any>)[value]) {
        cell.s = (ragStyles as Record<string, any>)[value];
      }
      
      return cell;
    });
    
    aoa.push(styledRow);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Enable autofilter
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  
  return ws;
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
  const origin = getAppOrigin();
  
  return [...modules]
    .sort((a, b) => a.year - b.year || a.order - b.order)
    .map((m) => {
      // Make URL a full clickable link
      let url = m.url || "";
      if (url && !url.startsWith("http")) {
        url = origin ? `${origin}${url.startsWith("/") ? "" : "/"}${url}` : url;
      }
      
      return {
        Year: m.year,
        Name: m.name,
        Code: m.code || "",
        Credits: m.credits || "",
        Compulsory: m.isCompulsory ? "Yes" : "No",
        Scheme: m.scheme || "",
        Organiser: m.organiser || "",
        "LO Count": learningOutcomes.filter((lo) => lo.moduleId === m.id).length,
        "Assessment Count": assessments.filter((a) => a.moduleId === m.id).length,
        URL: url,
      };
    });
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

export function downloadFullDetailXlsx(data: ExportData) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, makeSheet(programmeOverviewRows(data)), "Programme Info");
  XLSX.utils.book_append_sheet(wb, makeSheet(allLosRows(data)), "All LOs");
  XLSX.utils.book_append_sheet(wb, makeSheet(moduleListRows(data)), "Module List");
  XLSX.utils.book_append_sheet(wb, assessmentSummaryRows(data), "Assessments");
  XLSX.utils.book_append_sheet(wb, makeSheet(coverageStatsRows(data)), "Coverage Stats");
  XLSX.utils.book_append_sheet(wb, makeSheet(coverageMatrixRows(data)), "Coverage Matrix");

  const datePart = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeFilename(data.programme.name)}-full-detail-${datePart}.xlsx`);
}
