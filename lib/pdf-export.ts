import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { frameworkCompetencies } from "@/lib/framework";
import type { Programme, Module, LearningOutcome, Assessment } from "@/lib/app-data";

type ExportData = {
  programme: Programme;
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

const BRAND_BLUE: [number, number, number] = [37, 99, 235]; // blue-600
const DARK: [number, number, number] = [15, 23, 42]; // slate-900
const MID: [number, number, number] = [100, 116, 139]; // slate-500
const LIGHT: [number, number, number] = [248, 250, 252]; // slate-50

function addCoverPage(doc: jsPDF, programme: Programme) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageW, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("UNESCO AI Competency Explorer", pageW / 2, 28, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(programme.name, pageW / 2, 42, { align: "center" });

  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Generated: ${dateStr}`, pageW / 2, 76, { align: "center" });

  if (programme.description) {
    doc.setTextColor(...MID);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(programme.description, pageW - 40) as string[];
    doc.text(lines, pageW / 2, 90, { align: "center" });
  }
}

function addProgrammeStats(
  doc: jsPDF,
  startY: number,
  data: ExportData,
): number {
  const { programme, modules, learningOutcomes, assessments } = data;
  const mapped = learningOutcomes.filter((lo) => lo.moduleId).length;
  const coverage = learningOutcomes.length
    ? Math.round((mapped / learningOutcomes.length) * 100)
    : 0;
  const competenciesCovered = new Set(
    learningOutcomes
      .filter((lo) => lo.competencyId)
      .map((lo) => lo.competencyId),
  ).size;

  autoTable(doc, {
    startY,
    head: [["Metric", "Value"]],
    body: [
      ["Programme", programme.name],
      ["Years", String(programme.years)],
      ["Modules", String(modules.length)],
      ["Learning Outcomes", String(learningOutcomes.length)],
      ["LOs mapped to modules", `${mapped} / ${learningOutcomes.length} (${coverage}%)`],
      ["Competencies covered", `${competenciesCovered} / 12`],
      ["Assessments", String(assessments.length)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND_BLUE },
    alternateRowStyles: { fillColor: LIGHT },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function addModuleGrid(doc: jsPDF, startY: number, data: ExportData): number {
  const { modules, learningOutcomes, assessments } = data;
  const years = [...new Set(modules.map((m) => m.year))].sort((a, b) => a - b);

  let y = startY;
  for (const year of years) {
    const yearModules = modules
      .filter((m) => m.year === year)
      .sort((a, b) => a.order - b.order);

    autoTable(doc, {
      startY: y,
      head: [[{ content: `Year ${year}`, colSpan: 4, styles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255] as [number,number,number] } }], ["Module", "Code", "Credits", "LOs / Assessments"]],
      body: yearModules.map((m) => [
        m.name,
        m.code || "—",
        m.credits || "—",
        `${learningOutcomes.filter((lo) => lo.moduleId === m.id).length} LOs · ${assessments.filter((a) => a.moduleId === m.id).length} assessments`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [71, 85, 105] as [number,number,number] },
      alternateRowStyles: { fillColor: LIGHT },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  return y;
}

function addAssessmentSummary(doc: jsPDF, startY: number, data: ExportData): number {
  const { assessments } = data;

  const ragCounts = { Red: 0, Amber: 0, Green: 0, Unrated: 0 };
  const priorityCounts = { High: 0, Medium: 0, Low: 0, None: 0 };

  for (const a of assessments) {
    if (a.rag) ragCounts[a.rag]++;
    else ragCounts.Unrated++;
    if (a.priority) priorityCounts[a.priority]++;
    else priorityCounts.None++;
  }

  autoTable(doc, {
    startY,
    head: [["AI and Assessment taxonomy", "Count"]],
    body: Object.entries(ragCounts).map(([k, v]) => [k, String(v)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND_BLUE },
    alternateRowStyles: { fillColor: LIGHT },
    tableWidth: 80,
  });

  const ragFinalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    startY,
    margin: { left: 100 },
    head: [["Priority Rating", "Count"]],
    body: Object.entries(priorityCounts).map(([k, v]) => [k, String(v)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND_BLUE },
    alternateRowStyles: { fillColor: LIGHT },
    tableWidth: 80,
  });

  const priorFinalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  return Math.max(ragFinalY, priorFinalY);
}

function addCompetencyLOs(doc: jsPDF, startY: number, data: ExportData): number {
  const { learningOutcomes } = data;

  autoTable(doc, {
    startY,
    head: [["Competency", "Learning Outcome"]],
    body: frameworkCompetencies.flatMap((c) => {
      const los = learningOutcomes.filter((lo) => lo.competencyId === c.id);
      if (los.length === 0) {
        return [[`${c.id} ${c.title}`, "(none)"]];
      }
      return los.map((lo, i) => [
        i === 0 ? `${c.id} ${c.title}` : "",
        lo.text,
      ]);
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_BLUE },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function addLoModuleMapping(doc: jsPDF, startY: number, data: ExportData): number {
  const { learningOutcomes, modules } = data;
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  autoTable(doc, {
    startY,
    head: [["LO Text", "Competency", "Module"]],
    body: learningOutcomes.map((lo) => {
      const comp = frameworkCompetencies.find((c) => c.id === lo.competencyId);
      const mod = lo.moduleId ? moduleMap.get(lo.moduleId) : undefined;
      return [
        lo.text,
        comp ? `${comp.id} ${comp.title}` : (lo.category ?? "Unassigned"),
        mod ? `${mod.name}${mod.code ? ` (${mod.code})` : ""}` : "Unmapped",
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_BLUE },
    alternateRowStyles: { fillColor: LIGHT },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function addPerModuleAssessments(doc: jsPDF, startY: number, data: ExportData): number {
  const { modules, assessments } = data;
  let y = startY;

  for (const mod of [...modules].sort((a, b) => a.year - b.year || a.order - b.order)) {
    const modAssessments = assessments.filter((a) => a.moduleId === mod.id);
    if (modAssessments.length === 0) continue;

    autoTable(doc, {
      startY: y,
      head: [
        [
          {
            content: `${mod.name}${mod.code ? ` (${mod.code})` : ""} — Year ${mod.year}`,
            colSpan: 5,
            styles: { fillColor: [71, 85, 105] as [number,number,number], textColor: [255, 255, 255] as [number,number,number] },
          },
        ],
        ["Code", "Title", "Weight", "Duration", "Priority", "RAG"],
      ],
      body: modAssessments.map((a) => [
        a.assessmentCode || "—",
        a.title,
        a.weight || "—",
        a.duration || "—",
        a.priority ?? "—",
        a.rag ?? "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 116, 139] as [number,number,number] },
      alternateRowStyles: { fillColor: LIGHT },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  return y;
}

function sectionHeading(doc: jsPDF, y: number, title: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(14, y, pageW - 28, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, 18, y + 5.5);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  return y + 14;
}

function safeFilename(name: string) {
  return name.replaceAll(/[^\w\s-]/g, "").replaceAll(/\s+/g, "-").toLowerCase();
}

export function downloadSummaryPdf(data: ExportData) {
  const doc = new jsPDF({ orientation: "landscape" });

  addCoverPage(doc, data.programme);
  doc.addPage();

  let y = 20;
  y = sectionHeading(doc, y, "Programme Overview");
  y = addProgrammeStats(doc, y, data) + 10;
  y = sectionHeading(doc, y, "Module Grid");
  y = addModuleGrid(doc, y, data) + 10;
  doc.addPage();
  y = 20;
  y = sectionHeading(doc, y, "Assessment Summary");
  addAssessmentSummary(doc, y, data);

  const datePart = new Date().toISOString().slice(0, 10);
  doc.save(`${safeFilename(data.programme.name)}-summary-${datePart}.pdf`);
}

export function downloadFullDetailPdf(data: ExportData) {
  const doc = new jsPDF({ orientation: "landscape" });

  addCoverPage(doc, data.programme);
  doc.addPage();

  let y = 20;
  y = sectionHeading(doc, y, "Programme Overview");
  y = addProgrammeStats(doc, y, data) + 10;
  y = sectionHeading(doc, y, "Module Grid");
  y = addModuleGrid(doc, y, data) + 10;

  doc.addPage();
  y = 20;
  y = sectionHeading(doc, y, "Assessment Summary");
  y = addAssessmentSummary(doc, y, data) + 14;

  doc.addPage();
  y = 20;
  y = sectionHeading(doc, y, "Competencies and Learning Outcomes");
  y = addCompetencyLOs(doc, y, data) + 10;

  doc.addPage();
  y = 20;
  y = sectionHeading(doc, y, "LO-to-Module Mapping");
  y = addLoModuleMapping(doc, y, data) + 10;

  doc.addPage();
  y = 20;
  sectionHeading(doc, y, "Per-Module Assessment Details");
  addPerModuleAssessments(doc, y + 14, data);

  const datePart = new Date().toISOString().slice(0, 10);
  doc.save(`${safeFilename(data.programme.name)}-full-detail-${datePart}.pdf`);
}
