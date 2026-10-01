import ExcelJS from "exceljs";
import { toCsv, type CsvColumn } from "@/src/lib/csv";
import { deliverFile, type DeliveredFile } from "./deliverFile";

/**
 * One export, two formats.
 *
 * Spec 6.2 wants every export downloadable as both .xlsx and CSV. The column
 * definitions are shared, so a sheet and a CSV of the same export cannot drift
 * apart -- which is the whole reason this wraps both rather than each export
 * building its own.
 *
 * exceljs for the workbook rather than a lighter writer: these exports carry
 * dates, currency and long ids, which is exactly where a minimal writer
 * produces cells Excel then misreads.
 */
export type SheetFormat = "csv" | "xlsx";

export function isSheetFormat(value: unknown): value is SheetFormat {
    return value === "csv" || value === "xlsx";
}

async function buildXlsx<T>(rows: T[], columns: CsvColumn<T>[], sheetName: string): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Avoeline";
    workbook.created = new Date();

    // Excel rejects * ? : \ / [ ] in a sheet name and caps it at 31 characters,
    // and throws rather than truncating -- so an event title cannot be passed
    // through unsanitised.
    const safeName = (sheetName || "Export").replace(/[*?:\\/[\]]/g, "-").slice(0, 31) || "Export";
    const sheet = workbook.addWorksheet(safeName);

    sheet.columns = columns.map((c) => ({
        header: c.header,
        key: c.header,
        // Roomy enough to read without autofit, which exceljs does not do.
        width: Math.min(42, Math.max(12, c.header.length + 6)),
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    for (const row of rows) {
        sheet.addRow(columns.map((c) => {
            const value = c.value(row);
            return value === null || value === undefined ? "" : value;
        }));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buffer as ArrayBuffer);
}

const CONTENT_TYPE: Record<SheetFormat, string> = {
    csv: "text/csv; charset=utf-8",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Build an export in the requested format and hand back a download link.
 *
 * `baseName` is the filename without an extension; the format supplies it, so a
 * caller cannot produce a .csv containing a workbook.
 */
export async function deliverSheet<T>(
    baseName: string,
    format: SheetFormat,
    rows: T[],
    columns: CsvColumn<T>[],
    sheetName = "Export",
): Promise<DeliveredFile> {
    const body = format === "xlsx" ? await buildXlsx(rows, columns, sheetName) : toCsv(rows, columns);
    return deliverFile(`${baseName}.${format}`, body, CONTENT_TYPE[format]);
}

export async function deliverWorkbook(
    baseName: string,
    sheets: { name: string; rows: unknown[]; columns: CsvColumn<unknown>[] }[],
): Promise<DeliveredFile> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Avoeline";
    workbook.created = new Date();
    for (const entry of sheets) {
        const safeName = (entry.name || "Export").replace(/[*?:\\/[\]]/g, "-").slice(0, 31) || "Export";
        const sheet = workbook.addWorksheet(safeName);
        sheet.columns = entry.columns.map((c) => ({
            header: c.header,
            key: c.header,
            width: Math.min(42, Math.max(12, c.header.length + 6)),
        }));
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        for (const row of entry.rows) {
            sheet.addRow(entry.columns.map((c) => {
                const value = c.value(row);
                return value === null || value === undefined ? "" : value;
            }));
        }
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return deliverFile(`${baseName}.xlsx`, new Uint8Array(buffer as ArrayBuffer), CONTENT_TYPE.xlsx);
}
