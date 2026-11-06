/** Pure helpers for attendee Excel/Sheets import. */

export type ImportColumnKey = "email" | "name" | "phone" | "tier" | "skip" | `custom:${string}`;

export type ImportFieldOption = {
  key: ImportColumnKey;
  label: string;
};

export type ParsedImportTable = {
  headers: string[];
  rows: string[][];
};

export type MappedImportRow = {
  rowIndex: number;
  email: string;
  name: string;
  phone: string;
  tier: string;
  customResponses: Record<string, string>;
};

export type ImportRowPreview =
  | { rowIndex: number; ok: true; row: MappedImportRow }
  | { rowIndex: number; ok: false; error: string; email?: string };

export function parseDelimitedText(text: string): ParsedImportTable {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line: string) => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = split(lines[0]!).map((h) => h.trim());
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}

export function matrixToTable(matrix: string[][]): ParsedImportTable {
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = (matrix[0] || []).map((h) => String(h || "").trim());
  const width = headers.length;
  const rows = matrix.slice(1).map((r) => {
    const cells = r.map((c) => String(c || "").trim());
    while (cells.length < width) cells.push("");
    return cells.slice(0, width);
  });
  return { headers, rows };
}

export function guessColumnMap(headers: string[]): ImportColumnKey[] {
  return headers.map((h) => {
    const n = h.trim().toLowerCase();
    if (!n) return "skip";
    if (/(^e-?mail$|email address|attendee email)/i.test(n)) return "email";
    if (/^(full )?name$|attendee name|participant/i.test(n)) return "name";
    if (/phone|mobile|whatsapp/i.test(n)) return "phone";
    if (/^tier$|access tier|ticket/i.test(n)) return "tier";
    return "skip";
  });
}

export function mapRows(table: ParsedImportTable, columnMap: ImportColumnKey[]): MappedImportRow[] {
  return table.rows
    .map((cells, idx) => {
      let email = "";
      let name = "";
      let phone = "";
      let tier = "";
      const customResponses: Record<string, string> = {};
      columnMap.forEach((key, col) => {
        const val = String(cells[col] ?? "").trim();
        if (!key || key === "skip") return;
        if (key === "email") email = val.toLowerCase();
        else if (key === "name") name = val;
        else if (key === "phone") phone = val;
        else if (key === "tier") tier = val;
        else if (key.startsWith("custom:")) customResponses[key.slice(7)] = val;
      });
      return {
        rowIndex: idx + 2, // 1-based spreadsheet row (header is 1)
        email,
        name: name || email.split("@")[0] || "",
        phone,
        tier,
        customResponses,
      };
    })
    .filter((r) => r.email || r.name || r.phone || Object.keys(r.customResponses).length);
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function previewMappedRows(
  mapped: MappedImportRow[],
  existingEmails: Set<string>,
): ImportRowPreview[] {
  const seen = new Set<string>();
  return mapped.map((row) => {
    if (!looksLikeEmail(row.email)) {
      return {
        rowIndex: row.rowIndex,
        ok: false,
        error: "Valid email required.",
        email: row.email,
      };
    }
    if (!row.name.trim()) {
      return { rowIndex: row.rowIndex, ok: false, error: "Name required.", email: row.email };
    }
    const email = row.email.toLowerCase();
    if (existingEmails.has(email) || seen.has(email)) {
      return {
        rowIndex: row.rowIndex,
        ok: false,
        error: existingEmails.has(email) ? "Already registered." : "Duplicate in file.",
        email,
      };
    }
    seen.add(email);
    return { rowIndex: row.rowIndex, ok: true, row: { ...row, email } };
  });
}
