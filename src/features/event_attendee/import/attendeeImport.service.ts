import "server-only";

import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { EventService } from "@/src/services/event.service";
import { RegService } from "@/src/services/registeration.service";
import { isPaidEvent } from "@/src/features/registration/registration.service";
import {
  listAllFields,
  fieldsToCustomForm,
} from "@/src/features/registration/forms/formFields.service";
import { sanitizeAnswers } from "@/src/lib/customFields";
import { buildQrPayload, generateAndHostQr } from "@/src/features/registration/qr";
// qr helpers shared with public registration
import { readSpreadsheetValuesForActor } from "@/src/features/connections/server/sheetRead.service";
import {
  mapRows,
  matrixToTable,
  parseDelimitedText,
  previewMappedRows,
  type ImportColumnKey,
  type ImportFieldOption,
  type ImportRowPreview,
  type MappedImportRow,
  type ParsedImportTable,
} from "./attendeeImport.logic";

export async function importFieldOptions(eventId: string): Promise<ImportFieldOption[]> {
  const base: ImportFieldOption[] = [
    { key: "skip", label: "Ignore" },
    { key: "email", label: "Email" },
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "tier", label: "Access tier" },
  ];
  const fields = await listAllFields(eventId).catch(() => []);
  for (const f of fields) {
    if (["name", "email", "phone"].includes(f.key)) continue;
    base.push({ key: `custom:${f.key}`, label: f.label || f.key });
  }
  return base;
}

export async function parseUploadBuffer(buf: Buffer, filename: string): Promise<ParsedImportTable> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseDelimitedText(buf.toString("utf8"));
  }
  const wb = new ExcelJS.Workbook();
  // exceljs typings accept ArrayBuffer-like
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values;
    const arr = Array.isArray(values) ? values.slice(1) : [];
    matrix.push(arr.map((c) => String(c ?? "").trim()));
  });
  return matrixToTable(matrix);
}

export async function readGoogleSheetTable(opts: {
  actorId: string;
  connectionId: string;
  spreadsheetId: string;
}): Promise<ParsedImportTable> {
  const matrix = await readSpreadsheetValuesForActor({
    actorId: opts.actorId,
    connectionId: opts.connectionId,
    spreadsheetId: opts.spreadsheetId,
  });
  return matrixToTable(matrix);
}

export async function dryRunAttendeeImport(opts: {
  eventId: string;
  table: ParsedImportTable;
  columnMap: ImportColumnKey[];
}): Promise<{ paidBlocked: boolean; previews: ImportRowPreview[]; willCreate: number }> {
  const event = await EventService.getEventByID(opts.eventId);
  if (!event) throw new Error("Event not found.");
  const paidBlocked = isPaidEvent(event);
  const regs = await RegService.getRegsOfEvent(opts.eventId);
  const existing = new Set(
    regs
      .filter((r) => r.status !== "cancelled")
      .map((r) => (r.attendee?.email || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const mapped = mapRows(opts.table, opts.columnMap);
  const previews = previewMappedRows(mapped, existing);
  if (paidBlocked) {
    return {
      paidBlocked: true,
      previews: previews.map((p) =>
        p.ok
          ? {
              rowIndex: p.rowIndex,
              ok: false as const,
              error:
                "Paid events cannot use roster import. Mark the event free, or register people individually.",
              email: p.row.email,
            }
          : p,
      ),
      willCreate: 0,
    };
  }
  return {
    paidBlocked: false,
    previews,
    willCreate: previews.filter((p) => p.ok).length,
  };
}

async function insertImportedRow(opts: {
  eventId: string;
  organizerId: string;
  row: MappedImportRow;
  requiresApproval: boolean;
  customForm: ReturnType<typeof fieldsToCustomForm>;
}): Promise<{ ok: true; registrationId: string } | { ok: false; error: string }> {
  const registrationId = randomUUID();
  const now = new Date().toISOString();
  const status = opts.requiresApproval ? "pending" : "confirmed";
  const qr = await generateAndHostQr(
    buildQrPayload({
      name: opts.row.name.trim(),
      email: opts.row.email.trim(),
      eventId: opts.eventId,
      registrationId,
      timestamp: now,
    }),
  );
  const customResponses = sanitizeAnswers(opts.customForm, opts.row.customResponses);
  const { error } = await supabaseAdmin.from(TABLES.REGISTRATIONS).insert({
    id: registrationId,
    event_id: opts.eventId,
    user_id: null,
    attendee_name: opts.row.name.trim(),
    attendee_email: opts.row.email.trim().toLowerCase(),
    attendee_phone: opts.row.phone || null,
    organizer_id: opts.organizerId,
    status,
    waitlist_position: null,
    invite_id: null,
    custom_responses: customResponses,
    registration_source: "admin_panel",
    tier: opts.row.tier || "General",
    pricing_tier: opts.row.tier || "General",
    final_price: 0,
    payment_status: "completed",
    amount_paid: 0,
    payment_proof_path: null,
    checked_in: false,
    qr_code_data: qr?.data || "",
    // O1 A6: stop writing hosted QR URLs — render via /api/qr/[token].png
    qr_code_image_url: null,
    certificate_issued: false,
    ticket_tier_id: null,
    promo_code_used: null,
    communications: [],
    status_history: [{ status, timestamp: now, note: "Imported by organizer" }],
    group_id: null,
    extra: {
      attendee: {
        name: opts.row.name.trim(),
        email: opts.row.email.trim().toLowerCase(),
        phone: opts.row.phone || "",
      },
      imported: true,
    },
    created_at: now,
    updated_at: now,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, registrationId };
}

export async function commitAttendeeImport(opts: {
  eventId: string;
  table: ParsedImportTable;
  columnMap: ImportColumnKey[];
}): Promise<{
  created: number;
  skipped: number;
  errors: Array<{ rowIndex: number; error: string }>;
}> {
  const event = await EventService.getEventByID(opts.eventId);
  if (!event) throw new Error("Event not found.");
  if (isPaidEvent(event)) {
    return {
      created: 0,
      skipped: 0,
      errors: [{ rowIndex: 0, error: "Paid events cannot use roster import." }],
    };
  }
  const dry = await dryRunAttendeeImport(opts);
  const okRows = dry.previews.filter((p): p is Extract<ImportRowPreview, { ok: true }> => p.ok);
  const fields = await listAllFields(opts.eventId).catch(() => []);
  const customForm = fieldsToCustomForm(fields);
  const requiresApproval = Boolean(event.access?.requiresApproval);
  let created = 0;
  const errors: Array<{ rowIndex: number; error: string }> = [];
  for (const p of dry.previews) {
    if (!p.ok) {
      errors.push({ rowIndex: p.rowIndex, error: p.error });
      continue;
    }
  }
  for (const p of okRows) {
    const r = await insertImportedRow({
      eventId: opts.eventId,
      organizerId: event.organizerId,
      row: p.row,
      requiresApproval,
      customForm,
    });
    if (r.ok) created += 1;
    else errors.push({ rowIndex: p.row.rowIndex, error: r.error });
  }
  return {
    created,
    skipped:
      dry.previews.length -
      created -
      errors.filter((e) => e.rowIndex > 0).length +
      dry.previews.filter((p) => !p.ok).length,
    errors,
  };
}
