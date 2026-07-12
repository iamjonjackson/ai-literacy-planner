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

function programmeOverviewRows(data: ExportData): XLSX.WorkSheet {
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

  // Two-column layout with no header row - just labels and values
  const aoa: any[][] = [
    ["Programme name", programme.name],
    ["Description", programme.description || ""],
    ["Years", programme.years],
    ["Modules Under Review (Total)", modules.length],
    ["AI Competencies covered", competenciesCovered],
    ["New Learning Outcomes", newLosOnly?.length],
    ["New LOs mapped to modules", mapped],
    ["New LO mapping %", newLosOnly?.length ? Math.round((mapped / newLosOnly.length) * 100) + "%" : 0],
    ["Assessments (Total)", assessments.length],
    ["Assessments being reviewed", assessmentsBeingReviewed],
  ];

  return XLSX.utils.aoa_to_sheet(aoa);
}

function coverageStatsRows(data: ExportData) {
  const { assessments } = data;
  const ragCounts: Record<string, number> = { Red: 0, Amber: 0, Green: 0, Unrated: 0 };
  const priorityCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0, "No action required": 0 };
  const totalAssessments = assessments.length;

  for (const a of assessments) {
    if (a.rag) ragCounts[a.rag]++;
    else ragCounts["Unrated"]++;
    if (a.priority) priorityCounts[a.priority]++;
    else priorityCounts["No action required"]++;
  }

  return [
    ...Object.entries(ragCounts).map(([status, count]) => ({
      Category: "AI and Assessment taxonomy",
      Label: status,
      Count: count,
      Percentage: totalAssessments ? Math.round((count / totalAssessments) * 100) + "%" : 0,
    })),
    ...Object.entries(priorityCounts).map(([level, count]) => ({
      Category: "Priority Rating",
      Label: level,
      Count: count,
      Percentage: totalAssessments ? Math.round((count / totalAssessments) * 100) + "%" : 0,
    })),
  ];
}

function assessmentSummaryRows(data: ExportData): XLSX.WorkSheet {
  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));
  
  // Sort by priority then RAG
  const priorityOrder = { High: 0, Medium: 1, Low: 2, "No changes required": 3, "": 3 };
  const ragOrder = { Red: 0, Amber: 1, Green: 2, "": 3 };
  
  const sortedAssessments = [...data.assessments].sort((a, b) => {
    const aPriority = a.priority ?? "No changes required";
    const bPriority = b.priority ?? "No changes required";
    const priorityDiff = (priorityOrder as Record<string, number>)[aPriority] - (priorityOrder as Record<string, number>)[bPriority];
    if (priorityDiff !== 0) return priorityDiff;
    
    const aRag = a.rag ?? "";
    const bRag = b.rag ?? "";
    return (ragOrder as Record<string, number>)[aRag] - (ragOrder as Record<string, number>)[bRag];
  });
  
  // Build array of arrays with styling
  const headers = [
    "Module", "Module Code", "Assessment Code", "Assessment Title", "Weight", "Duration",
    "Redesign Priority", "AI and Assessment taxonomy", "Year"
  ];
  
  const aoa: any[][] = [];
  aoa.push(headers.map(h => ({ t: "s", v: h })));
  
  sortedAssessments.forEach((a) => {
    const mod = moduleMap.get(a.moduleId);
    const priorityValue = a.priority || "No changes required";
    
    const rowData = [
      mod?.name || "",
      mod?.code || "",
      a.assessmentCode || "",
      a.title,
      a.weight || "",
      a.duration || "",
      priorityValue,
      a.rag || "",
      mod?.year ?? "",
    ];
    
    const styledRow = rowData.map((value, colIdx) => {
      const cell: XLSX.CellObject = { t: typeof value === 'number' ? 'n' : 's', v: value };
      
      if (colIdx === 6 && value && (priorityStyles as Record<string, any>)[value]) {
        cell.s = (priorityStyles as Record<string, any>)[value];
      }
      
      if (colIdx === 7 && value && (ragStyles as Record<string, any>)[value]) {
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

function allLosRows(data: ExportData): XLSX.WorkSheet {
  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));
  const rows = data.learningOutcomes.map((lo) => {
    const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
    const mod = lo.moduleId ? moduleMap.get(lo.moduleId) : undefined;
    return {
      "Module Code": mod?.code || "",
      "Module": mod?.name || "Unmapped",
      "Year": mod?.year ?? "",
      "LO Text": lo.text,
      "AI Competency ID": comp?.id || "",
      "AI Competency Title": comp?.title || "",
      "Category": lo.category || "",
    };
  });
  
  const ws = makeSheet(rows);
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  return ws;
}

function moduleListRows(data: ExportData): XLSX.WorkSheet {
  const { modules, learningOutcomes, assessments } = data;
  const origin = getAppOrigin();
  
  const rows = [...modules]
    .sort((a, b) => a.year - b.year || a.order - b.order)
    .map((m) => {
      // Make URL a full clickable link
      let url = m.url || "";
      if (url && !url.startsWith("http")) {
        url = origin ? `${origin}${url.startsWith("/") ? "" : "/"}${url}` : url;
      }
      
      const moduleLos = learningOutcomes.filter((lo) => lo.moduleId === m.id);
      const moduleAssessments = assessments.filter((a) => a.moduleId === m.id);
      
      const newLosCount = moduleLos.filter((lo) => lo.competencyId !== null && lo.status !== "to_delete").length;
      const deletedLosCount = moduleLos.filter((lo) => lo.status === "to_delete").length;
      const deletedAssessmentsCount = moduleAssessments.filter((a) => a.status === "to_delete").length;
      const hasChanges = newLosCount > 0 || deletedLosCount > 0 || deletedAssessmentsCount > 0;
      
      return {
        Year: m.year,
        Name: m.name,
        Code: m.code || "",
        Credits: m.credits || "",
        Compulsory: m.isCompulsory ? "Yes" : "No",
        Scheme: m.scheme || "",
        Organiser: m.organiser || "",
        "LO Count": moduleLos.length,
        "New LOs": newLosCount,
        "Deleted LOs": deletedLosCount,
        "Deleted Assessments": deletedAssessmentsCount,
        "Has Changes": hasChanges ? "Yes" : "No",
        "Assessment Count": moduleAssessments.length,
        URL: url,
      };
    });
  
  const ws = makeSheet(rows);
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  return ws;
}

function coverageMatrixRows(data: ExportData): XLSX.WorkSheet {
  const { modules, learningOutcomes } = data;
  const sortedModules = [...modules].sort((a, b) => a.year - b.year || a.order - b.order);

  const rows = frameworkCompetencies.map((comp) => {
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

  const ws = makeSheet(rows);
  
  // Add footer with UNESCO link
  if (ws["!ref"]) {
    const ref = XLSX.utils.decode_range(ws["!ref"]);
    const footerRow = ref.e.r + 1;
    ws[`A${footerRow}`] = { t: "s", v: `For more information on UNESCO AI competencies see ${getAppOrigin()}/explore` };
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({ s: { r: footerRow - 1, c: 0 }, e: { r: footerRow - 1, c: ref.e.c } });
  }
  
  return ws;
}

function programmeLosRows(data: ExportData): XLSX.WorkSheet {
  const { learningOutcomes } = data;
  
  // Programme-level LOs (not mapped to modules)
  const programmeLos = learningOutcomes.filter((lo) => lo.moduleId === null);
  
  // Categorize them
  const newLos = programmeLos.filter((lo) => lo.competencyId !== null && lo.status !== "to_delete");
  const removedLos = programmeLos.filter((lo) => lo.status === "to_delete");
  const existingLos = programmeLos.filter((lo) => lo.competencyId === null && lo.status !== "to_delete");
  
  const rows = [
    ...newLos.map((lo) => {
      const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
      return {
        "LO Number": lo.loNumber || "",
        "LO Text": lo.text,
        "AI Competency ID": comp?.id || "",
        "AI Competency": comp?.title || "",
        Category: lo.category || "",
        Status: "AI Mapped",
      };
    }),
    ...removedLos.map((lo) => {
      const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
      return {
        "LO Number": lo.loNumber || "",
        "LO Text": lo.text,
        "AI Competency ID": comp?.id || "",
        "AI Competency": comp?.title || "",
        Category: lo.category || "",
        Status: "Removed",
      };
    }),
    ...existingLos.map((lo) => ({
      "LO Number": lo.loNumber || "",
      "LO Text": lo.text,
      "AI Competency ID": "",
      "AI Competency": "",
      Category: lo.category || "",
      Status: "",
    })),
  ];
  
  const ws = makeSheet(rows);
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  return ws;
}

export function downloadFullDetailXlsx(data: ExportData) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, programmeOverviewRows(data), "Programme Info");
  XLSX.utils.book_append_sheet(wb, makeSheet(coverageStatsRows(data)), "Stats");
  XLSX.utils.book_append_sheet(wb, coverageMatrixRows(data), "AI coverage matrix");
  XLSX.utils.book_append_sheet(wb, programmeLosRows(data), "Programme LOs");
  XLSX.utils.book_append_sheet(wb, allLosRows(data), "Module LOs");
  XLSX.utils.book_append_sheet(wb, moduleListRows(data), "Module List");
  XLSX.utils.book_append_sheet(wb, assessmentSummaryRows(data), "Assessments");

  const datePart = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeFilename(data.programme.name)}-full-detail-${datePart}.xlsx`);
}
