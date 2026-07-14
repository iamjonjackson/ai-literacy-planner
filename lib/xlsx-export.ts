import * as XLSX from "xlsx-js-style";
import type { CellStyle } from "xlsx-js-style";
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

// ============================================
// STYLE DEFINITIONS
// ============================================

// Color palette matching the app's design system
const styles: {
  header: CellStyle;
  subHeader: CellStyle;
  label: CellStyle;
  value: CellStyle;
  url: CellStyle;
  priority: Record<string, CellStyle>;
  rag: Record<string, CellStyle>;
  status: Record<string, CellStyle>;
  coverage: Record<string, CellStyle>;
  count: Record<string, CellStyle>;
} = {
  // Header style - dark blue background, white bold text, centered
  header: {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "374151" } },
    alignment: { horizontal: "center", vertical: "center" },
  },
  
  // Sub-header style - gray background, dark text, centered
  subHeader: {
    font: { bold: true, color: { rgb: "1F2937" } },
    fill: { fgColor: { rgb: "E5E7EB" } },
    alignment: { horizontal: "center", vertical: "center" },
  },
  
  // Priority styles
  priority: {
    High: { 
      fill: { fgColor: { rgb: "374151" } }, 
      font: { color: { rgb: "FFFFFF" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    Medium: { 
      fill: { fgColor: { rgb: "6B7280" } }, 
      font: { color: { rgb: "FFFFFF" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    Low: { 
      fill: { fgColor: { rgb: "E5E7EB" } }, 
      font: { color: { rgb: "1F2937" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    "No action required": { 
      fill: { fgColor: { rgb: "F3F4F6" } }, 
      font: { color: { rgb: "6B7280" } }, 
      alignment: { horizontal: "center" }
    },
    "To be removed": { 
      fill: { fgColor: { rgb: "FEE2E2" } }, 
      font: { color: { rgb: "991B1B" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
  },
  
  // RAG (Red/Amber/Green) styles
  rag: {
    Red: { 
      fill: { fgColor: { rgb: "FEE2E2" } }, 
      font: { color: { rgb: "991B1B" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    Amber: { 
      fill: { fgColor: { rgb: "FDE68A" } }, 
      font: { color: { rgb: "92400E" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    Green: { 
      fill: { fgColor: { rgb: "D1FAE5" } }, 
      font: { color: { rgb: "065F46" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    "": { 
      fill: { fgColor: { rgb: "F3F4F6" } }, 
      font: { color: { rgb: "6B7280" } }, 
      alignment: { horizontal: "center" }
    },
  },
  
  // Status styles for LOs and other binary states
  status: {
    "AI Mapped": { 
      fill: { fgColor: { rgb: "D1FAE5" } }, 
      font: { color: { rgb: "065F46" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    "To be removed": { 
      fill: { fgColor: { rgb: "FEE2E2" } }, 
      font: { color: { rgb: "991B1B" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    Yes: { 
      fill: { fgColor: { rgb: "D1FAE5" } }, 
      font: { color: { rgb: "065F46" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
    No: { 
      fill: { fgColor: { rgb: "FEE2E2" } }, 
      font: { color: { rgb: "991B1B" }, bold: true }, 
      alignment: { horizontal: "center" }
    },
  },
  
  // Coverage matrix styles
  coverage: {
    covered: { 
      fill: { fgColor: { rgb: "D1FAE5" } }, 
      font: { color: { rgb: "065F46" } }, 
      alignment: { horizontal: "center", vertical: "center" }
    },
    notCovered: { 
      fill: { fgColor: { rgb: "FEE2E2" } }, 
      font: { color: { rgb: "991B1B" } }, 
      alignment: { horizontal: "center", vertical: "center" }
    },
    empty: { 
      fill: { fgColor: { rgb: "F3F4F6" } },
      alignment: { horizontal: "center", vertical: "center" }
    },
  },
  
  // Label style for Programme Info (left column)
  label: {
    font: { bold: true, color: { rgb: "374151" } },
    alignment: { horizontal: "right" },
  },
  
  // Value style for Programme Info (right column)
  value: {
    font: { color: { rgb: "1F2937" } },
    alignment: { horizontal: "left" },
  },
  
  // Count styles - highlight non-zero counts
  count: {
    positive: { 
      font: { color: { rgb: "065F46" }, bold: true },
      alignment: { horizontal: "center" }
    },
    zero: { 
      font: { color: { rgb: "9CA3AF" } },
      alignment: { horizontal: "center" }
    },
    negative: { 
      fill: { fgColor: { rgb: "FEE2E2" } },
      font: { color: { rgb: "991B1B" }, bold: true },
      alignment: { horizontal: "center" }
    },
  },
  
  // URL style
  url: {
    font: { color: { rgb: "2563EB" }, underline: true },
  },
};

// Helper to apply style to a cell in aoa format
function styledCell(value: string | number | boolean | Date | null, style?: CellStyle): XLSX.CellObject {
  if (value === null || value === undefined) {
    return { t: 's', v: '' };
  }
  const cell: XLSX.CellObject = {
    t: typeof value === 'number' ? 'n' : 's',
    v: value,
  };
  if (style) {
    cell.s = style;
  }
  return cell;
}

// Helper to get app origin for URL
function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

// ============================================
// SHEET GENERATORS
// ============================================

function programmeOverviewRows(data: ExportData): XLSX.WorkSheet {
  const { programme, modules, learningOutcomes, assessments } = data;
  const newLearningOutcomes = learningOutcomes.filter((lo) => lo.competencyId !== null).length;
  const assessmentsBeingReviewed = assessments.filter(
    (a) => a.priority !== null
  ).length;
  const newLosOnly = learningOutcomes.filter((lo) => lo.competencyId !== null);
  const mapped = newLosOnly.filter((lo) => lo.moduleId).length;
  const competenciesCovered = new Set(
    newLosOnly.map((lo) => lo.competencyId),
  ).size;

  // Create styled aoa
  const aoa: XLSX.CellObject[][] = [
    [
      styledCell("Programme name", styles.label),
      styledCell(programme.name, styles.value),
    ],
    [
      styledCell("Description", styles.label),
      styledCell(programme.description || "", styles.value),
    ],
    [
      styledCell("Years", styles.label),
      styledCell(programme.years, styles.value),
    ],
    [], // Empty row for spacing
    [
      styledCell("Modules Under Review (Total)", styles.label),
      styledCell(modules.length, styles.value),
    ],
    [
      styledCell("AI Competencies covered", styles.label),
      styledCell(competenciesCovered, {
        ...styles.value,
        font: { ...styles.value.font, bold: true, color: { rgb: "065F46" } },
      }),
    ],
    [
      styledCell("New Learning Outcomes", styles.label),
      styledCell(newLosOnly?.length, styles.value),
    ],
    [
      styledCell("New LOs mapped to modules", styles.label),
      styledCell(mapped, styles.value),
    ],
    [
      styledCell("New LO mapping %", styles.label),
      styledCell(newLosOnly?.length ? Math.round((mapped / newLosOnly.length) * 100) + "%" : "0%", {
        ...styles.value,
        font: { ...styles.value.font, bold: true },
      }),
    ],
    [], // Empty row for spacing
    [
      styledCell("Assessments (Total)", styles.label),
      styledCell(assessments.length, styles.value),
    ],
    [
      styledCell("Assessments being reviewed", styles.label),
      styledCell(assessmentsBeingReviewed, {
        ...styles.value,
        font: { ...styles.value.font, bold: true, color: assessmentsBeingReviewed > 0 ? { rgb: "991B1B" } : { rgb: "065F46" } },
      }),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 30 },
    { wch: 50 },
  ];
  
  return ws;
}

function coverageStatsRows(data: ExportData): XLSX.WorkSheet {
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

  // Build styled rows
  const aoa: XLSX.CellObject[][] = [
    [
      styledCell("Category", styles.header),
      styledCell("Label", styles.header),
      styledCell("Count", styles.header),
      styledCell("Percentage", styles.header),
    ],
    [], // Empty row
    [
      styledCell("AI and Assessment taxonomy", styles.subHeader),
      styledCell("", styles.subHeader),
      styledCell("", styles.subHeader),
      styledCell("", styles.subHeader),
    ],
    ...Object.entries(ragCounts).map(([status, count]) => [
      styledCell("", styles.value),
      styledCell(status, styles.rag[status] || styles.value),
      styledCell(count, styles.value),
      styledCell(totalAssessments ? Math.round((count / totalAssessments) * 100) + "%" : "0%", styles.value),
    ]),
    [], // Empty row
    [
      styledCell("Priority Rating", styles.subHeader),
      styledCell("", styles.subHeader),
      styledCell("", styles.subHeader),
      styledCell("", styles.subHeader),
    ],
    ...Object.entries(priorityCounts).map(([level, count]) => [
      styledCell("", styles.value),
      styledCell(level, styles.priority[level] || styles.value),
      styledCell(count, styles.value),
      styledCell(totalAssessments ? Math.round((count / totalAssessments) * 100) + "%" : "0%", styles.value),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
  ];
  
  // Enable autofilter
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  
  return ws;
}

function assessmentSummaryRows(data: ExportData): XLSX.WorkSheet {
  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));
  
  // Sort by priority then RAG
  const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2, "No changes required": 3, "": 3, null: 3, undefined: 3 };
  const ragOrder: Record<string, number> = { Red: 0, Amber: 1, Green: 2, "": 3, null: 3, undefined: 3 };
  
  const sortedAssessments = [...data.assessments].sort((a, b) => {
    const aPriority = a.priority ?? "No changes required";
    const bPriority = b.priority ?? "No changes required";
    const priorityDiff = priorityOrder[aPriority] - priorityOrder[bPriority];
    if (priorityDiff !== 0) return priorityDiff;
    
    const aRag = a.rag ?? "";
    const bRag = b.rag ?? "";
    return ragOrder[aRag] - ragOrder[bRag];
  });
  
  // Build array of arrays with styling
  const headers = [
    "Module", "Module Code", "Assessment Code", "Assessment Title", "Weight", "Duration",
    "Redesign Priority", "AI and Assessment taxonomy", "Year"
  ];
  
  const aoa: XLSX.CellObject[][] = [];
  
  // Header row with styling
  aoa.push(headers.map(h => styledCell(h, styles.header)));
  
  sortedAssessments.forEach((a) => {
    const mod = moduleMap.get(a.moduleId);
    const isDeleted = a.status === "to_delete";
    const priorityValue = isDeleted ? "To be removed" : (a.priority || "No changes required");
    const yearValue = isDeleted ? "" : (mod?.year ?? "");
    
    const row = [
      styledCell(mod?.name || "", isDeleted ? styles.status["To be removed"] : styles.value),
      styledCell(mod?.code || "", isDeleted ? styles.status["To be removed"] : styles.value),
      styledCell(a.assessmentCode || "", isDeleted ? styles.status["To be removed"] : styles.value),
      styledCell(a.title, isDeleted ? styles.status["To be removed"] : styles.value),
      styledCell(a.weight || "", isDeleted ? styles.status["To be removed"] : styles.value),
      styledCell(a.duration || "", isDeleted ? styles.status["To be removed"] : styles.value),
      styledCell(priorityValue, styles.priority[priorityValue] || styles.value),
      styledCell(a.rag || "", styles.rag[a.rag || ""] || styles.value),
      styledCell(yearValue, isDeleted ? styles.status["To be removed"] : styles.value),
    ];
    
    aoa.push(row);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 40 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 8 },
  ];
  
  // Enable autofilter
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  
  return ws;
}

function allLosRows(data: ExportData): XLSX.WorkSheet {
  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));
  
  // Filter to only include LOs that are linked to a module, then sort by module code then year
  const sortedLos = [...data.learningOutcomes]
    .filter((lo) => lo.moduleId !== null)
    .sort((a, b) => {
      const aMod = a.moduleId ? moduleMap.get(a.moduleId) : null;
      const bMod = b.moduleId ? moduleMap.get(b.moduleId) : null;
      
      if (!aMod || !bMod) return 0;
      
      // Primary sort by module code
      const codeCompare = (aMod.code || "").localeCompare(bMod.code || "");
      if (codeCompare !== 0) return codeCompare;
      
      // Secondary sort by year
      return aMod.year - bMod.year;
    })
    .map((lo) => {
      const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
      const mod = lo.moduleId ? moduleMap.get(lo.moduleId) : undefined;
      const isDeleted = lo.status === "to_delete";
      const statusText = isDeleted ? "To be removed" : (lo.competencyId ? "AI Mapped" : "");
      
      return {
        "Module Code": mod?.code || "",
        "Module": mod?.name || "Unmapped",
        "Year": mod?.year ?? "",
        "LO Text": lo.text,
        "AI Competency ID": comp?.id || "",
        "AI Competency Title": comp?.title || "",
        "Category": isDeleted ? "" : (lo.category || ""),
        "Status": statusText,
      };
    });
  
  // Build styled aoa
  const aoa: XLSX.CellObject[][] = [];
  
  // Header
  const headers = [
    "Module Code", "Module", "Year", "LO Text", 
    "AI Competency ID", "AI Competency Title", "Category", "Status"
  ];
  aoa.push(headers.map(h => styledCell(h, styles.header)));
  
  // Data rows
  sortedLos.forEach((lo) => {
    const statusStyle = lo.Status ? styles.status[lo.Status as keyof typeof styles.status] : styles.value;
    aoa.push([
      styledCell(lo["Module Code"], styles.value),
      styledCell(lo["Module"], styles.value),
      styledCell(lo["Year"], styles.value),
      styledCell(lo["LO Text"], styles.value),
      styledCell(lo["AI Competency ID"], styles.value),
      styledCell(lo["AI Competency Title"], styles.value),
      styledCell(lo["Category"], styles.value),
      styledCell(lo["Status"], statusStyle),
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 8 },
    { wch: 60 },
    { wch: 20 },
    { wch: 35 },
    { wch: 20 },
    { wch: 15 },
  ];
  
  // Enable autofilter
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
  
  // Build styled aoa
  const aoa: XLSX.CellObject[][] = [];
  
  // Header
  const headers = [
    "Year", "Name", "Code", "Credits", "Compulsory", "Scheme", "Organiser",
    "LO Count", "New LOs", "Deleted LOs", "Deleted Assessments", "Has Changes",
    "Assessment Count", "URL"
  ];
  aoa.push(headers.map(h => styledCell(h, styles.header)));
  
  // Data rows
  rows.forEach((row) => {
    const hasChangesStyle = row["Has Changes"] === "Yes" ? styles.status.Yes : styles.status.No;
    const newLosStyle = row["New LOs"] > 0 ? styles.count.positive : styles.count.zero;
    const deletedLosStyle = row["Deleted LOs"] > 0 ? styles.count.negative : styles.count.zero;
    const deletedAssessmentsStyle = row["Deleted Assessments"] > 0 ? styles.count.negative : styles.count.zero;
    
    aoa.push([
      styledCell(row.Year, styles.value),
      styledCell(row.Name, styles.value),
      styledCell(row.Code, styles.value),
      styledCell(row.Credits, styles.value),
      styledCell(row.Compulsory, styles.value),
      styledCell(row.Scheme, styles.value),
      styledCell(row.Organiser, styles.value),
      styledCell(row["LO Count"], styles.value),
      styledCell(row["New LOs"], newLosStyle),
      styledCell(row["Deleted LOs"], deletedLosStyle),
      styledCell(row["Deleted Assessments"], deletedAssessmentsStyle),
      styledCell(row["Has Changes"], hasChangesStyle),
      styledCell(row["Assessment Count"], styles.value),
      styledCell(row.URL, row.URL ? styles.url : styles.value),
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 40 },
  ];
  
  // Enable autofilter
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  
  return ws;
}

function coverageMatrixRows(data: ExportData): XLSX.WorkSheet {
  const { modules, learningOutcomes } = data;
  const sortedModules = [...modules].sort((a, b) => a.year - b.year || a.order - b.order);

  // Build header row
  const headerRow: XLSX.CellObject[] = [
    styledCell("Competency ID", styles.header),
    styledCell("Competency Title", styles.header),
    styledCell("LO Count", styles.header),
  ];
  
  sortedModules.forEach((mod) => {
    headerRow.push(styledCell(`${mod.code || mod.name} (Y${mod.year})`, styles.header));
  });

  const aoa: XLSX.CellObject[][] = [headerRow];

  frameworkCompetencies.forEach((comp) => {
    const row: XLSX.CellObject[] = [
      styledCell(comp.id, styles.value),
      styledCell(comp.title, styles.value),
      styledCell(learningOutcomes.filter((lo) => lo.competencyId === comp.id).length, styles.value),
    ];
    
    for (const mod of sortedModules) {
      const covered = learningOutcomes.some(
        (lo) => lo.competencyId === comp.id && lo.moduleId === mod.id,
      );
      const cellStyle = covered ? styles.coverage.covered : styles.coverage.notCovered;
      row.push(styledCell(covered ? "✓" : "", cellStyle));
    }
    
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Set column widths
  const colWidths = [
    { wch: 15 },
    { wch: 40 },
    { wch: 12 },
    ...sortedModules.map(() => ({ wch: 20 })),
  ];
  ws["!cols"] = colWidths;
  
  // Add footer with UNESCO link
  if (ws["!ref"]) {
    const ref = XLSX.utils.decode_range(ws["!ref"]);
    const footerRow = ref.e.r + 1;
    ws[`A${footerRow}`] = { 
      t: "s", 
      v: `For more information on UNESCO AI competencies see ${getAppOrigin()}/explore`,
      s: { font: { italic: true, color: { rgb: "6B7280" } } }
    };
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({ s: { r: footerRow - 1, c: 0 }, e: { r: footerRow - 1, c: ref.e.c } });
  }
  
  // Enable autofilter
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
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
  
  // Build styled aoa
  const aoa: XLSX.CellObject[][] = [];
  
  // Header
  const headers = ["LO Number", "LO Text", "AI Competency ID", "AI Competency", "Category", "Status"];
  aoa.push(headers.map(h => styledCell(h, styles.header)));
  
  // New LOs (AI Mapped)
  newLos.forEach((lo) => {
    const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
    aoa.push([
      styledCell(lo.loNumber || "", styles.value),
      styledCell(lo.text, styles.value),
      styledCell(comp?.id || "", styles.value),
      styledCell(comp?.title || "", styles.value),
      styledCell(lo.category || "", styles.value),
      styledCell("AI Mapped", styles.status["AI Mapped"]),
    ]);
  });
  
  // Removed LOs
  removedLos.forEach((lo) => {
    const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
    aoa.push([
      styledCell(lo.loNumber || "", styles.status["To be removed"]),
      styledCell(lo.text, styles.status["To be removed"]),
      styledCell(comp?.id || "", styles.status["To be removed"]),
      styledCell(comp?.title || "", styles.status["To be removed"]),
      styledCell("", styles.status["To be removed"]),
      styledCell("To be removed", styles.status["To be removed"]),
    ]);
  });
  
  // Existing LOs (not AI mapped)
  existingLos.forEach((lo) => {
    aoa.push([
      styledCell(lo.loNumber || "", styles.value),
      styledCell(lo.text, styles.value),
      styledCell("", styles.value),
      styledCell("", styles.value),
      styledCell(lo.category || "", styles.value),
      styledCell("", styles.value),
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 12 },
    { wch: 60 },
    { wch: 20 },
    { wch: 35 },
    { wch: 20 },
    { wch: 15 },
  ];
  
  // Enable autofilter
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  
  return ws;
}

export function downloadFullDetailXlsx(data: ExportData) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, programmeOverviewRows(data), "Programme Info");
  XLSX.utils.book_append_sheet(wb, coverageStatsRows(data), "Stats");
  XLSX.utils.book_append_sheet(wb, coverageMatrixRows(data), "AI coverage matrix");
  XLSX.utils.book_append_sheet(wb, programmeLosRows(data), "Programme LOs");
  XLSX.utils.book_append_sheet(wb, allLosRows(data), "Module LOs");
  XLSX.utils.book_append_sheet(wb, moduleListRows(data), "Module List");
  XLSX.utils.book_append_sheet(wb, assessmentSummaryRows(data), "Assessments");

  const datePart = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeFilename(data.programme.name)}-full-detail-${datePart}.xlsx`);
}
