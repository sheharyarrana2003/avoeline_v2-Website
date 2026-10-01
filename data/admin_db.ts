/**
 * Compatibility façade: remaining services still speak a Firestore-shaped API.
 * All reads/writes go to Postgres via supabaseAdmin. Do not import from Client Components.
 */
import { randomUUID } from "crypto";
import { supabaseAdmin } from "./supabase";
import { TABLE_COLUMNS } from "./tableColumns";

export type QueryDocumentSnapshot = {
  id: string;
  exists: boolean;
  data: () => any;
  ref: any;
};
export type QuerySnapshot = {
  empty: boolean;
  size: number;
  docs: QueryDocumentSnapshot[];
  forEach: (cb: (doc: QueryDocumentSnapshot) => void) => void;
};
export type DocumentSnapshot = QueryDocumentSnapshot;
export type DocumentReference = ReturnType<typeof makeDoc>;
export type Query = any;
export type Transaction = {
  get: (target: { get: () => Promise<any> }) => Promise<any>;
  set: (ref: DocumentReference, data: object, opts?: { merge?: boolean }) => Promise<void>;
  update: (ref: DocumentReference, data: object) => Promise<void>;
  delete: (ref: DocumentReference) => Promise<void>;
};
export type DocumentData = Record<string, unknown>;
export const FieldValue = {
  arrayUnion: (...vals: unknown[]) => ({ __op: "arrayUnion", vals }),
  increment: (n: number) => ({ __op: "increment", n }),
};

const EXTRA_COLS: Record<string, string[]> = {
  hackathon_teams: ["scores", "round", "extra", "access_code_hash"],
  registrations: ["extra", "communications", "status_history", "organizer_id", "tier", "pricing_tier", "hackathon_access_code_hash"],
  hackathon_judges: ["extra"],
  hackathon_tracks: ["extra"],
  hackathon_ctf_challenges: ["extra"],
  events: ["extra"],
  bookings: ["extra"],
  event_invites: ["extra"],
  users: ["extra"],
};

const REG_STATUS_OUT: Record<string, string> = {
  pending: "pending_approval",
  confirmed: "registered",
  attended: "checked_in",
  no_show: "cancelled",
};
const REG_STATUS_IN: Record<string, string> = {
  pending_approval: "pending",
  registered: "confirmed",
};
const PAY_OUT: Record<string, string> = { completed: "paid", refunded: "failed" };
const PAY_IN: Record<string, string> = { paid: "completed", free: "completed" };

function snakeKey(key: string): string {
  if (key === "__name__" || key === "id") return "id";
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, "");
}

function toSnake(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toSnake);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === "merge" || k.startsWith("_") || k.startsWith("__")) continue;
    out[snakeKey(k)] = toSnake(v);
  }
  return out;
}

function toCamel(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(toCamel);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = toCamel(v);
    out[k] = v;
  }
  return out;
}

function uuidOrNull(val: unknown): unknown {
  if (val == null || val === "") return null;
  const s = String(val);
  if (s === "undefined" || s === "null") return null;
  return s;
}

function allowedCols(table: string): Set<string> {
  return new Set([...(TABLE_COLUMNS[table] || []), ...(EXTRA_COLS[table] || []), "extra"]);
}

function flattenRegistration(obj: Record<string, unknown>, id: string): Record<string, unknown> {
  const attendee = (obj.attendee || {}) as Record<string, unknown>;
  const payment = (obj.payment || {}) as Record<string, unknown>;
  const qr = (obj.qrCode || obj.qr_code || {}) as Record<string, unknown>;
  const checkIn = (obj.checkIn || obj.check_in || {}) as Record<string, unknown>;
  const cert = (obj.certificate || {}) as Record<string, unknown>;
  const status = String(obj.status || "pending");
  const payStatus = String(payment.paymentStatus || obj.payment_status || "pending");
  return {
    id,
    event_id: uuidOrNull(obj.eventId || obj.event_id),
    user_id: uuidOrNull(obj.userId || obj.user_id),
    attendee_name: attendee.name || obj.attendee_name || "",
    attendee_email: attendee.email || obj.attendee_email || "",
    attendee_phone: attendee.phone || obj.attendee_phone || "",
    ticket_tier_id: uuidOrNull(obj.ticketTierId || obj.ticket_tier_id),
    final_price: obj.finalPrice ?? obj.final_price ?? 0,
    promo_code_used: obj.promoCodeUsed || obj.promo_code_used || null,
    custom_responses: obj.customResponses || obj.custom_responses || {},
    invite_id: uuidOrNull(obj.inviteId || obj.invite_id),
    status: REG_STATUS_OUT[status] || status,
    waitlist_position: obj.waitlistPosition ?? obj.waitlist_position ?? null,
    registration_source: obj.registrationSource || obj.registration_source || "web",
    qr_code_data: qr.data || obj.qr_code_data || "",
    qr_code_image_url: qr.imageUrl || obj.qr_code_image_url || "",
    checked_in: Boolean(checkIn.checkedIn ?? obj.checked_in),
    check_in_time: checkIn.checkInTime || obj.check_in_time || null,
    check_in_method: checkIn.checkInMethod || obj.check_in_method || null,
    checked_in_by: uuidOrNull(checkIn.checkedInBy || obj.checked_in_by),
    payment_status: PAY_OUT[payStatus] || payStatus,
    amount_paid: payment.amountPaid ?? obj.amount_paid ?? 0,
    payment_proof_path: payment.proofPath || obj.payment_proof_path || null,
    certificate_issued: Boolean(cert.issued ?? obj.certificate_issued),
    certificate_id: uuidOrNull(cert.certificateId || obj.certificate_id),
    feedback_submitted: Boolean(obj.feedbackSubmitted ?? obj.feedback_submitted),
    rating: obj.rating ?? null,
    review_id: uuidOrNull(obj.reviewId || obj.review_id),
    communications: obj.communications || [],
    status_history: obj.statusHistory || obj.status_history || [],
    organizer_id: uuidOrNull(obj.organizerId || obj.organizer_id),
    tier: obj.tier || null,
    pricing_tier: obj.pricingTier || obj.pricing_tier || null,
    cancelled_at: obj.cancelledAt || obj.cancelled_at || null,
    hackathon_access_code_hash: obj.hackathonAccessCodeHash || obj.hackathon_access_code_hash || null,
    group_id: uuidOrNull(obj.groupId || obj.group_id),
    extra: obj,
  };
}

function hydrateRegistration(row: Record<string, unknown>): Record<string, unknown> {
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<string, unknown>;
  const status = String(row.status || extra.status || "pending");
  const pay = String(row.payment_status || "pending");
  return {
    ...extra,
    ...(toCamel(row) as Record<string, unknown>),
    registrationId: row.id,
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id || "",
    organizerId: row.organizer_id || extra.organizerId,
    attendee: extra.attendee || {
      name: row.attendee_name,
      email: row.attendee_email,
      phone: row.attendee_phone,
    },
    status: REG_STATUS_IN[status] || status,
    waitlistPosition: row.waitlist_position,
    inviteId: row.invite_id,
    customResponses: row.custom_responses || {},
    payment: extra.payment || {
      paymentId: "",
      amountPaid: row.amount_paid,
      currency: extra.currency || "PKR",
      paymentMethod: extra.paymentMethod || "bank_transfer",
      paymentStatus: PAY_IN[pay] || pay,
      transactionId: null,
      invoiceUrl: null,
      proofPath: row.payment_proof_path,
    },
    pricingTier: row.pricing_tier,
    finalPrice: row.final_price,
    checkIn: extra.checkIn || {
      checkedIn: row.checked_in,
      checkInTime: row.check_in_time,
      checkInMethod: row.check_in_method,
      checkedInBy: row.checked_in_by,
      deviceId: null,
    },
    qrCode: extra.qrCode || {
      data: row.qr_code_data,
      imageUrl: row.qr_code_image_url,
      scanCount: 0,
      lastScanned: null,
    },
    certificate: extra.certificate || {
      type: "digital",
      issued: row.certificate_issued,
      certificateId: row.certificate_id,
      issueDate: null,
      downloadUrl: null,
      sharedOnLinkedIn: false,
    },
    communications: row.communications || extra.communications || [],
    statusHistory: row.status_history || extra.status_history || [],
    feedbackSubmitted: row.feedback_submitted,
    rating: row.rating,
    reviewId: row.review_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cancelledAt: row.cancelled_at,
    hackathonAccessCodeHash: row.hackathon_access_code_hash || extra.hackathonAccessCodeHash || null,
    hackathonAccessCode: extra.hackathonAccessCode || extra.hackathon_access_code || null,
    hackathonTeamId: extra.hackathonTeamId || extra.hackathon_team_id || null,
    groupId: row.group_id || extra.groupId || extra.group_id || null,
    groupRole: extra.groupRole === "lead" || extra.groupRole === "member" ? extra.groupRole : extra.group_role || null,
  };
}

function prepareRow(table: string, obj: Record<string, unknown>, id: string): Record<string, unknown> {
  let source = { ...obj };
  if (table === "event_invites" && source.kind === "invite") source.kind = "invite_link";
  if (table === "hackathon_teams" && source.feeStatus === "fee_pending") source.feeStatus = "unpaid";
  if (table === "hackathon_teams" && source.feeStatus === "not_required") source.feeStatus = "unpaid";
  if (table === "bookings" && source.status === "in_progress") source.status = "confirmed";

  if (table === "registrations") {
    return pickAllowed(table, flattenRegistration(source, id));
  }

  const snake = toSnake(source) as Record<string, unknown>;
  const pk = idColFor(table);
  snake[pk] = id;
  if (pk !== "id") delete snake.id;
  if (table === "organizer_profiles" || table === "vendor_profiles" || table === "attendee_profiles") {
    snake.user_id = snake.user_id || id;
  }
  const allowed = allowedCols(table);
  const row: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(snake)) {
    if (k === "extra") continue;
    let val = v;
    if ((k === "id" || k.endsWith("_id")) && (val === "" || val === undefined)) val = null;
    if (allowed.has(k)) row[k] = val;
    else extra[k] = val;
  }
  if (allowed.has("extra")) row.extra = { ...(typeof source.extra === "object" && source.extra ? source.extra : {}), ...extra, ...source };
  return row;
}

function pickAllowed(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const allowed = allowedCols(table);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!allowed.has(k)) continue;
    out[k] = k === "id" || k.endsWith("_id") ? (v === "" ? null : v) : v;
  }
  return out;
}

function rowToDoc(table: string, row: Record<string, unknown>) {
  const hydrated = table === "registrations" ? hydrateRegistration(row) : (toCamel({
    ...((row.extra && typeof row.extra === "object" ? row.extra : {}) as object),
    ...row,
  }) as Record<string, unknown>);
  const key = row[idColFor(table)] ?? row.id;
  if (hydrated && key) hydrated.id = String(key);
  return {
    id: String(key || hydrated.id || ""),
    exists: true,
    data: () => hydrated as any,
    ref: makeDoc(table, String(key)),
  };
}

type Filter = { col: string; op: string; val: unknown };

class PgQuery {
  constructor(
    private table: string,
    private filters: Filter[] = [],
    private limitN: number | null = null,
    private order: { col: string; asc: boolean } | null = null,
  ) {}

  where(field: string, op: string, val: unknown) {
    let col = snakeKey(field);
    if (this.table.endsWith("_profiles") && col === "id") col = "user_id";
    if (this.table === "hackathon_settings" && col === "id") col = "event_id";
    if (this.table === "registrations" && field === "registrationId") col = "id";
    if (this.table === "bookings" && field === "bookingId") col = "id";
    let mapped = val;
    if (this.table === "registrations" && col === "status" && typeof val === "string") {
      mapped = REG_STATUS_OUT[val] || val;
    }
    return new PgQuery(this.table, [...this.filters, { col, op, val: mapped }], this.limitN, this.order);
  }

  limit(n: number) {
    return new PgQuery(this.table, this.filters, n, this.order);
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    return new PgQuery(this.table, this.filters, this.limitN, { col: snakeKey(field), asc: dir !== "desc" });
  }

  async get(): Promise<QuerySnapshot> {
    let q = supabaseAdmin.from(this.table).select("*");
    for (const f of this.filters) {
      if (f.op === "==") q = q.eq(f.col, f.val as never);
      else if (f.op === "in") q = q.in(f.col, f.val as never[]);
      else if (f.op === "!=") q = q.neq(f.col, f.val as never);
      else if (f.op === ">=") q = q.gte(f.col, f.val as never);
      else if (f.op === "<=") q = q.lte(f.col, f.val as never);
      else if (f.op === "array-contains") q = q.contains(f.col, [f.val] as never);
    }
    if (this.order) q = q.order(this.order.col, { ascending: this.order.asc });
    if (this.limitN) q = q.limit(this.limitN);
    const { data, error } = await q;
    if (error) throw error;
    const docs = (data ?? []).map((row) => rowToDoc(this.table, row as Record<string, unknown>));
    return {
      empty: docs.length === 0,
      docs,
      size: docs.length,
      forEach: (fn: (d: QueryDocumentSnapshot) => void) => docs.forEach(fn),
    };
  }
}

function idColFor(table: string): string {
  if (table.endsWith("_profiles")) return "user_id";
  // PK is the event, not a separate id column — select/eq on `id` 42703s.
  if (table === "hackathon_settings") return "event_id";
  return "id";
}

/**
 * Partial writes must not replace the whole `extra` jsonb, or fields kept there
 * are lost. Returns whether the row already exists.
 */
async function mergeStoredExtra(table: string, id: string, row: Record<string, unknown>): Promise<boolean> {
  const hasExtra = !!row.extra && typeof row.extra === "object";
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(hasExtra ? "extra" : idColFor(table))
    .eq(idColFor(table), id)
    .maybeSingle();
  if (error || !data) return false;
  const stored = (data as { extra?: unknown }).extra;
  if (hasExtra && stored && typeof stored === "object") row.extra = { ...(stored as object), ...(row.extra as object) };
  return true;
}

function makeDoc(table: string, id: string) {
  const ref = {
    id,
    async get() {
      const idCol = idColFor(table);
      const { data, error } = await supabaseAdmin.from(table).select("*").eq(idCol, id).maybeSingle();
      if (error) throw error;
      if (!data) return { id, exists: false, data: () => undefined, ref };
      return rowToDoc(table, data as Record<string, unknown>);
    },
    async set(obj: object, opts?: { merge?: boolean }) {
      const row = prepareRow(table, obj as Record<string, unknown>, id);
      // An upsert of a partial row trips NOT NULL columns it leaves out, so an
      // existing row is merged with a plain update instead.
      if (opts?.merge && (await mergeStoredExtra(table, id, row))) {
        const patch = { ...row };
        delete patch[idColFor(table)];
        delete patch.id;
        const { error } = await supabaseAdmin.from(table).update(patch).eq(idColFor(table), id);
        if (error) throw error;
        return;
      }
      const { error } = await supabaseAdmin.from(table).upsert(row);
      if (error) throw error;
    },
    async create(obj: object) {
      return this.set(obj);
    },
    async update(obj: object) {
      const row = prepareRow(table, obj as Record<string, unknown>, id);
      delete row.id;
      await mergeStoredExtra(table, id, row);
      const { error } = await supabaseAdmin.from(table).update(row).eq(idColFor(table), id);
      if (error) throw error;
    },
    async delete() {
      const { error } = await supabaseAdmin.from(table).delete().eq(idColFor(table), id);
      if (error) throw error;
    },
    collection(sub: string) {
      if (sub === "tasks") {
        return {
          async get() {
            const { data } = await supabaseAdmin.from("event_checklist_items").select("*").eq("event_id", id);
            const docs = (data ?? []).map((row) => ({
              id: row.id,
              exists: true,
              data: () => toCamel(row),
              ref: makeDoc("event_checklist_items", String(row.id)),
            }));
            return { empty: !docs.length, docs, size: docs.length, forEach: (fn: (d: (typeof docs)[0]) => void) => docs.forEach(fn) };
          },
          doc(subId?: string) {
            const sid = subId || randomUUID();
            return {
              id: sid,
              async set(obj: object) {
                await supabaseAdmin.from("event_checklist_items").upsert({
                  id: sid,
                  event_id: id,
                  label: String((obj as { title?: string; label?: string }).title || (obj as { label?: string }).label || ""),
                  done: Boolean((obj as { done?: boolean }).done),
                });
              },
            };
          },
        };
      }
      return new Collection(sub);
    },
  };
  return ref;
}

class Collection extends PgQuery {
  constructor(private tableName: string) {
    super(tableName);
  }

  doc(id?: string) {
    return makeDoc(this.tableName, id || randomUUID());
  }

  async add(obj: object) {
    const ref = this.doc();
    await ref.set(obj);
    return ref;
  }
}

export const adminDb = {
  collection(name: string) {
    return new Collection(name);
  },
  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set(ref: { set: (o: object, opts?: object) => Promise<void> }, obj: object, opts?: object) {
        ops.push(() => ref.set(obj, opts));
      },
      update(ref: { update: (o: object) => Promise<void> }, obj: object) {
        ops.push(() => ref.update(obj));
      },
      delete(ref: { delete: () => Promise<void> }) {
        ops.push(() => ref.delete());
      },
      async commit() {
        for (const op of ops) await op();
      },
    };
  },
  async getAll(...refs: Array<{ get: () => Promise<{ exists: boolean; data: () => unknown; id: string }> }>) {
    return Promise.all(refs.map((r) => r.get()));
  },
  async runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const tx: Transaction = {
      get: (target) => target.get(),
      set: (ref, data, opts) => ref.set(data, opts),
      update: (ref, data) => ref.update(data),
      delete: (ref) => ref.delete(),
    };
    return fn(tx);
  },
  bulkWriter() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set(ref: { set: (o: object) => Promise<void> }, obj: object) {
        ops.push(() => ref.set(obj));
      },
      update(ref: { update: (o: object) => Promise<void> }, obj: object) {
        ops.push(() => ref.update(obj));
      },
      delete(ref: { delete: () => Promise<void> }) {
        ops.push(() => ref.delete());
      },
      async close() {
        for (const op of ops) await op();
      },
    };
  },
};

export const adminAuth = {
  async createUser(input: { email: string; password: string; displayName?: string; userType?: string }) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.displayName,
        ...(input.userType ? { user_type: input.userType } : {}),
      },
    });
    if (error || !data.user) {
      const err = new Error(error?.message || "createUser failed") as Error & { code?: string };
      err.code = /already|exists/i.test(error?.message || "") ? "auth/email-already-exists" : "auth/invalid-password";
      throw err;
    }
    return { uid: data.user.id };
  },
  async updateUser(id: string, patch: { password?: string; email?: string; disabled?: boolean }) {
    const body: {
      password?: string;
      email?: string;
      ban_duration?: string;
    } = {};
    if (patch.password) body.password = patch.password;
    if (patch.email) body.email = patch.email;
    if (patch.disabled === true) body.ban_duration = "876000h";
    if (patch.disabled === false) body.ban_duration = "none";
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, body);
    if (error) throw error;
  },
  async revokeRefreshTokens(id: string) {
    await supabaseAdmin.auth.admin.signOut(id, "global");
  },
  async deleteUser(id: string) {
    await supabaseAdmin.auth.admin.signOut(id, "global").catch(() => {});
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error && !/not found|does not exist/i.test(error.message)) throw error;
  },
};
