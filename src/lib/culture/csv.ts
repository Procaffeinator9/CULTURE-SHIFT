import { parseISODate } from "./dates.ts";
import type { EvidenceKind, Observation } from "./types.ts";

const KINDS = new Set<EvidenceKind>(["attention", "behavior", "meaning"]);

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = false;
      } else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseObservationCsv(text: string): { rows: Omit<Observation, "id">[]; errors: string[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["The file is empty."] };
  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const dateIdx = header.indexOf("date");
  const signalIdx = header.indexOf("signal");
  const noteIdx = header.indexOf("note");
  const sourceIdx = header.indexOf("source");
  const kindIdx = header.indexOf("kind");
  if (dateIdx < 0) return { rows: [], errors: ["A date column is required."] };

  const rows: Omit<Observation, "id">[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const date = cells[dateIdx] ?? "";
    if (!parseISODate(date)) {
      errors.push(`Row ${i + 1}: “${date || "blank"}” is not a YYYY-MM-DD date. The row was skipped.`);
      continue;
    }
    const rawSignal = signalIdx >= 0 ? (cells[signalIdx] ?? "") : "";
    let signal: number | null = null;
    if (rawSignal !== "") {
      const value = Number(rawSignal);
      if (!Number.isFinite(value)) {
        errors.push(`Row ${i + 1}: signal “${rawSignal}” is not a number. The row was skipped. Blank signal is allowed; zero is not assumed.`);
        continue;
      }
      signal = value;
    }
    const kindRaw = (kindIdx >= 0 ? cells[kindIdx] : "")?.toLowerCase();
    const kind: EvidenceKind = KINDS.has(kindRaw as EvidenceKind) ? (kindRaw as EvidenceKind) : "attention";
    rows.push({
      date,
      signal,
      note: noteIdx >= 0 ? (cells[noteIdx] ?? "") : "",
      source: sourceIdx >= 0 ? cells[sourceIdx] || "csv-import" : "csv-import",
      kind,
      provenance: "csv-import",
    });
  }
  return { rows, errors };
}

export const CSV_TEMPLATE = `date,signal,note,source,kind
2024-04-01,12,Example row — delete. Blank signal is allowed and is not stored as zero.,your-source,attention
2024-05-01,,Example note with no number. Kind may be attention behavior or meaning.,interview,meaning
`;
