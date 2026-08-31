/**
 * CSV serialization, to RFC 4180.
 *
 * Hand-rolled rather than a dependency because the whole job is quoting, and
 * the rules are short enough to get right once: double the quotes, wrap any
 * field containing a quote, comma or newline, and separate rows with CRLF.
 * A parser would be a different question — this only writes.
 */

/** One column: a header and how to pull its value off a row. */
export type CsvColumn<T> = {
    header: string;
    value: (row: T) => string | number | boolean | null | undefined;
};

/**
 * Spreadsheets execute a cell that begins with =, +, - or @, so a field like
 * `=HYPERLINK(...)` in an exported attendee name becomes a live formula the
 * moment someone opens the file. Prefixing with an apostrophe keeps the text
 * visible and inert. This is the one thing a CSV writer must not skip: the
 * values here come from attendee-supplied names and answers.
 */
function neutralize(text: string): string {
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function encodeField(raw: string | number | boolean | null | undefined): string {
    if (raw === null || raw === undefined) return "";
    // Numbers and booleans are safe by construction and must NOT be neutralized:
    // -1 begins with '-', so guarding them turned every negative figure into the
    // text "'-1" and broke arithmetic in the exported sheet.
    if (typeof raw !== "string") return String(raw);
    const text = neutralize(raw);
    // Leading/trailing spaces are quoted too, or they are silently trimmed by
    // some readers and a padded id stops matching.
    return /[",\n\r]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * `withBom` prepends a UTF-8 byte order mark. Excel on Windows assumes the
 * local codepage without it, which turns every non-ASCII name into mojibake —
 * so it defaults on for files people open in Excel.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[], withBom = true): string {
    const lines = [
        columns.map((c) => encodeField(c.header)).join(","),
        ...rows.map((row) => columns.map((c) => encodeField(c.value(row))).join(",")),
    ];
    return (withBom ? "﻿" : "") + lines.join("\r\n");
}
