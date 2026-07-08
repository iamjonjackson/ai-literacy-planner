import Papa from "papaparse";
import type { CsvModuleImportRow } from "@/lib/app-data";

export type CsvPreviewRow = {
  code: string;
  name: string;
  year: number;
  isCompulsory: boolean;
  credits: string;
  loCount: number;
  assessmentCount: number;
  isUpsert: boolean;
  skipped: false;
};

export type CsvSkippedRow = {
  rawName: string;
  reason: string;
  skipped: true;
};

export type CsvParseResult = {
  preview: CsvPreviewRow[];
  skipped: CsvSkippedRow[];
  importRows: CsvModuleImportRow[];
};

function parseLearningOutcomes(
  raw: string,
): CsvModuleImportRow["learningOutcomes"] {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const parts = entry.split("|").map((p) => p.trim());
      // Expected: category | lo_number | text
      if (parts.length < 3) return [];
      const [category, loNumber, ...rest] = parts;
      const text = rest.join("|").trim();
      if (!text) return [];
      return [{ category: category ?? "", loNumber: loNumber ?? "", text }];
    });
}

function parseAssessments(
  raw: string,
): CsvModuleImportRow["assessments"] {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const parts = entry.split("|").map((p) => p.trim());
      // Expected: assessment_code | title | weight [| duration]
      if (parts.length < 3) return [];
      const [assessmentCode, title, weight, duration] = parts;
      if (!title) return [];
      return [
        {
          assessmentCode: assessmentCode ?? "",
          title,
          weight: weight ?? "",
          duration: duration?.trim() ?? "",
        },
      ];
    });
}

export async function parseCsvFile(
  file: File,
  existingCodes: Set<string>,
): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete(results) {
        const preview: CsvPreviewRow[] = [];
        const skipped: CsvSkippedRow[] = [];
        const importRows: CsvModuleImportRow[] = [];

        for (const row of results.data) {
          const rawName = row["module_name"]?.trim() ?? "";
          const rawLevel = row["level"]?.trim() ?? "";
          const rawCode = row["module_code"]?.trim() ?? "";

          if (!rawName) {
            skipped.push({ rawName: rawCode || "(no name)", reason: "Missing module_name", skipped: true });
            continue;
          }

          const level = parseInt(rawLevel, 10);
          if (!rawLevel || isNaN(level) || level < 4 || level > 8) {
            skipped.push({
              rawName,
              reason: `Invalid level "${rawLevel}" — expected 4–8`,
              skipped: true,
            });
            continue;
          }

          const year = level - 3;
          const compulsoryRaw = row["compulsory"]?.trim().toLowerCase() ?? "";
          const isCompulsory = compulsoryRaw === "yes";
          const credits = row["credits"]?.trim() ?? "";
          const scheme = row["scheme"]?.trim() ?? "";
          const organiser = row["organiser"]?.trim() ?? "";
          const aims = row["aims"]?.trim() ?? "";
          const url = row["url"]?.trim() ?? "";

          const learningOutcomes = parseLearningOutcomes(row["learning_outcomes"] ?? "");
          const assessments = parseAssessments(row["assessments"] ?? "");

          const isUpsert = Boolean(rawCode && existingCodes.has(rawCode));

          preview.push({
            code: rawCode,
            name: rawName,
            year,
            isCompulsory,
            credits,
            loCount: learningOutcomes.length,
            assessmentCount: assessments.length,
            isUpsert,
            skipped: false,
          });

          importRows.push({
            code: rawCode,
            name: rawName,
            year,
            isCompulsory,
            credits,
            scheme,
            organiser,
            aims,
            url,
            learningOutcomes,
            assessments,
          });
        }

        resolve({ preview, skipped, importRows });
      },
      error(err) {
        reject(new Error(err.message));
      },
    });
  });
}
