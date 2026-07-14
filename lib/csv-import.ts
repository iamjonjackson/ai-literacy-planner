import Papa from "papaparse";
import type { CsvModuleImportRow, CsvProgrammeLearningOutcomeImportRow } from "@/lib/app-data";

/**
 * Fixes common character encoding issues from CSV files.
 * Handles Windows-1252 characters that are often misread as UTF-8.
 * Replaces the Unicode replacement character and fixes common smart quotes.
 */
function fixEncoding(text: string): string {
  if (!text) return text;

  return text
    // Replace Unicode replacement character (U+FFFD) which appears when invalid bytes are read as UTF-8
    .replace(/\ufffd/g, "'")
    // Fix common Windows-1252 to UTF-8 mojibake for smart quotes and apostrophes
    .replace(/\u0092/g, "'") // Windows-1252 right single quote (0x92) -> apostrophe
    .replace(/\u2019/g, "'") // Proper right single quote -> apostrophe
    .replace(/\u2018/g, "'") // Proper left single quote -> apostrophe
    .replace(/\u201c/g, '"') // Left double quote -> straight double quote
    .replace(/\u201d/g, '"') // Right double quote -> straight double quote
    .replace(/\u2026/g, "..."); // Ellipsis -> three dots
}

/**
 * Trims and fixes encoding for a string value.
 */
function cleanText(text: string | undefined): string {
  if (!text) return "";
  return fixEncoding(text.trim());
}

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

export type CsvProgrammeLearningOutcomePreviewRow = {
  loNumber: string;
  category: string;
  text: string;
};

export type ProgrammeLearningOutcomeCsvParseResult = {
  preview: CsvProgrammeLearningOutcomePreviewRow[];
  skipped: CsvSkippedRow[];
  importRows: CsvProgrammeLearningOutcomeImportRow[];
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
      return [{
        category: fixEncoding(category ?? ""),
        loNumber: fixEncoding(loNumber ?? ""),
        text: fixEncoding(text),
      }];
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
          assessmentCode: fixEncoding(assessmentCode ?? ""),
          title: fixEncoding(title),
          weight: fixEncoding(weight ?? ""),
          duration: fixEncoding(duration?.trim() ?? ""),
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
          const rawName = cleanText(row["module_name"]);
          const rawLevel = cleanText(row["level"]);
          const rawCode = cleanText(row["module_code"]);

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
          const compulsoryRaw = cleanText(row["compulsory"]).toLowerCase();
          const isCompulsory = compulsoryRaw === "yes";
          const credits = cleanText(row["credits"]);
          const scheme = cleanText(row["scheme"]);
          const organiser = cleanText(row["organiser"]);
          const aims = cleanText(row["aims"]);
          const url = cleanText(row["url"]);

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

export async function parseProgrammeLearningOutcomesCsvFile(
  file: File,
): Promise<ProgrammeLearningOutcomeCsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete(results) {
        const preview: CsvProgrammeLearningOutcomePreviewRow[] = [];
        const skipped: CsvSkippedRow[] = [];
        const importRows: CsvProgrammeLearningOutcomeImportRow[] = [];

        for (const row of results.data) {
          const loNumber = cleanText(row["number"]);
          const category = cleanText(row["type"]);
          const text = cleanText(row["lo"]);
          const rawName = loNumber || category || text || "(blank row)";

          if (!loNumber) {
            skipped.push({ rawName, reason: "Missing number", skipped: true });
            continue;
          }

          if (!category) {
            skipped.push({ rawName, reason: "Missing type", skipped: true });
            continue;
          }

          if (!text) {
            skipped.push({ rawName, reason: "Missing LO", skipped: true });
            continue;
          }

          preview.push({ loNumber, category, text });
          importRows.push({ loNumber, category, text });
        }

        resolve({ preview, skipped, importRows });
      },
      error(err) {
        reject(new Error(err.message));
      },
    });
  });
}
