import * as XLSX from "xlsx";

const MAX_OUTPUT_LENGTH = 50000;

function truncateContent(content: string) {
  if (content.length <= MAX_OUTPUT_LENGTH) {
    return content;
  }

  return `${content.slice(0, MAX_OUTPUT_LENGTH)}\n\n[Contenido truncado por longitud]`;
}

function escapeCsvCell(value: unknown) {
  const stringValue = String(value ?? "");

  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function aoaToCsv(rows: unknown[][]) {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

export async function parseExcel(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv")) {
    const csvContent = await file.text();
    return truncateContent(csvContent);
  }

  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    throw new Error("Formato de archivo no soportado. Usá Excel o CSV.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const content = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return `=== Hoja: ${sheetName} ===\n\n`;
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      blankrows: false
    });
    const csv = aoaToCsv(rows);
    return `=== Hoja: ${sheetName} ===\n${csv}\n\n`;
  }).join("");

  return truncateContent(content);
}
