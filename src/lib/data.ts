import { supabase } from "./supabase";
import { businessConfig, storageKey } from "./business";
import { services } from "./i18n";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type WalkinStatus = "waiting" | "served" | "cancelled";

export type BookingUI = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  comments: string;
  /** null = price on consultation (price_pending). Never treat as 0. */
  price: number | null;
  agreedPrice?: number | null;
  pricePending?: boolean;
  durationIsEstimate?: boolean;
  paymentMethod?: string;
  duration: number;
  createdAt: number;
  status?: BookingStatus;
  reminder_sent?: boolean;
  reminder_time?: number;
  reminder_channel?: "email" | "sms" | "whatsapp";
  business_id?: string | null;
};

export type WalkinUI = {
  id: number | string;
  name?: string;
  phone?: string;
  createdAt?: number;
  attended?: boolean;
  status?: WalkinStatus;
  estimated_wait_minutes?: number;
  business_id?: string | null;
};

export type ReminderUI = {
  id?: string;
  appointment_id?: string | null;
  customer_name: string;
  email?: string | null;
  phone?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  reminder_time?: string | null;
  channel: "email" | "sms" | "whatsapp";
  status: "pending" | "sent" | "failed";
  message: string;
  sent_at?: string | null;
  created_at?: string | null;
  business_id?: string | null;
};

const BK = storageKey("bookings");
const WK = storageKey("queue");


export type Source = "supabase" | "localStorage";

const legacyServices: Record<string, string> = {
  haircut: "haircut",
  cut_styling: "haircut",
  "Corte y peinado": "haircut",
  "Cut & styling": "haircut",
  "Corte de cabello": "haircut",
  "Corte de pelo": "haircut",
  "Corte de Pelo": "haircut",
  "Corte con Tijera": "haircut",
  "Corte de Cabello Largo": "haircut",

  beard: "beard_trim",
  "Arreglo de barba": "beard_trim",
  "Acondicionado de Barba": "beard_trim",

  shave: "beard_razor",
  "Afeitado clásico": "beard_razor",
  Afeitado: "beard_razor",

  "Cabeza Rapada": "buzz_cut",
  "Shaved Head": "buzz_cut",

  "Corte de Pelo para niños": "kids",
  "Kids Haircut": "kids",

  "Perfilado de Cabello": "haircut",
  "Hair Line-Up": "haircut",
};

function cleanStatus(status: any): BookingStatus {
  if (
    status === "completed" ||
    status === "cancelled" ||
    status === "pending" ||
    status === "confirmed"
  ) {
    return status;
  }

  return "confirmed";
}

function cleanWalkinStatus(status: any): WalkinStatus {
  if (status === "served" || status === "cancelled" || status === "waiting") {
    return status;
  }

  return "waiting";
}

function findService(value: string) {
  const normalized = legacyServices[value] || value;

  return (
    services.find(
      (s) =>
        s.id === normalized ||
        s.name_es === normalized ||
        s.name_en === normalized ||
        s.id === value ||
        s.name_es === value ||
        s.name_en === value,
    ) || null
  );
}

function rowToBooking(r: any): BookingUI {
  const svc = findService(r.service_name || "");

  return {
    id: r.id,
    name: r.customer_name || "",
    phone: r.phone || "",
    email: r.email || "",
    service: svc ? svc.id : r.service_name || "",
    barber: r.barber || "",
    date: r.appointment_date || "",
    time: String(r.appointment_time || "").slice(0, 5),
    comments: r.comments || "",
    price:
      r.service_price === null || r.service_price === undefined
        ? null
        : Number(r.service_price),
    agreedPrice:
      r.agreed_price === null || r.agreed_price === undefined
        ? null
        : Number(r.agreed_price),
    pricePending: Boolean(r.price_pending),
    durationIsEstimate: Boolean(r.duration_is_estimate),
    paymentMethod: r.payment_method || "cash_in_person",
    duration: Number(r.service_duration) || Number(svc?.duration) || 30,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    status: cleanStatus(r.status),
    reminder_sent: Boolean(r.reminder_sent),
    business_id: r.business_id || null,
  };
}

function bookingToRow(b: BookingUI) {
  const svc = findService(b.service);

  return {
    customer_name: b.name,
    phone: b.phone,
    email: b.email || "",
    service_name: svc ? svc.name_es : b.service,
    service_price:
      b.pricePending || b.price === null || b.price === undefined
        ? null
        : Number(b.price),
    service_duration: Number(b.duration) || Number(svc?.duration) || 30,
    barber: b.barber,
    appointment_date: b.date,
    appointment_time: b.time,
    comments: b.comments || null,
    reminder_sent: Boolean(b.reminder_sent),
    status: b.status || "confirmed",
  };
}

function rowToWalkin(r: any): WalkinUI {
  const status = cleanWalkinStatus(r.status);

  return {
    id: r.id,
    name: r.customer_name || "",
    phone: r.phone || "",
    createdAt: r.joined_at ? new Date(r.joined_at).getTime() : Date.now(),
    estimated_wait_minutes: Number(r.estimated_wait_minutes) || 15,
    attended: status === "served",
    status,
    business_id: r.business_id || null,
  };
}

function rowToReminder(r: any): ReminderUI {
  return {
    id: r.id,
    appointment_id: r.appointment_id || null,
    customer_name: r.customer_name || "",
    email: r.email || "",
    phone: r.phone || "",
    appointment_date: r.appointment_date || null,
    appointment_time: r.appointment_time
      ? String(r.appointment_time).slice(0, 5)
      : null,
    reminder_time: r.reminder_time || null,
    channel: r.channel || "email",
    status: r.status || "pending",
    message: r.message || "",
    sent_at: r.sent_at || null,
    created_at: r.created_at || null,
    business_id: r.business_id || null,
  };
}

function lsGet<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/**
 * This app represents a single business. The identifier always comes from
 * the central configuration; the business_id column is kept in every table
 * so the schema stays compatible with a future multi-business version.
 */
export function getCurrentBusinessId(): string | null {
  return businessConfig.businessId || null;
}

/** Kept for API compatibility. The business identity is configuration-driven. */
export function setCurrentBusinessId(_id: string | null) {
  // no-op: single-business application
}

async function hasAuthenticatedSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.user);
  } catch {
    return false;
  }
}

function publicSlotToBooking(r: any): BookingUI {
  return {
    name: "",
    phone: "",
    email: "",
    service: "",
    barber: r.barber || "",
    date: r.appointment_date || r.date || "",
    time: String(r.appointment_time || r.time || "").slice(0, 5),
    comments: "",
    price: 0,
    duration: Number(r.service_duration || r.duration) || 30,
    createdAt: Date.now(),
    status: cleanStatus(r.status),
    business_id: r.business_id || null,
  };
}

// ---------- Catalogue (server-side authority) ----------

export type CatalogueService = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  duration: number;
};

export type CatalogueStaff = {
  id: string;
  slug: string;
  name: string;
};

let cataloguePromise: Promise<{
  services: CatalogueService[];
  staff: CatalogueStaff[];
}> | null = null;

/** Reads the authoritative catalogue (public, read-only). Cached per session. */
export function loadCatalogue() {
  if (!cataloguePromise) {
    cataloguePromise = (async () => {
      const [svc, stf] = await Promise.all([
        supabase
          .from("services")
          .select(
            "id, slug, name, price, duration_minutes, booking_block_minutes, price_on_consultation, duration_variable",
          )
          .eq("is_active", true),
        supabase.from("staff").select("id, slug, name").eq("is_active", true),
      ]);

      if (svc.error) throw svc.error;
      if (stf.error) throw stf.error;

      return {
        services: (svc.data || []).map((r: any) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          price: r.price_on_consultation ? null : Number(r.price) || null,
          duration:
            Number(r.booking_block_minutes) || Number(r.duration_minutes) || 30,
        })),
        staff: (stf.data || []).map((r: any) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
        })),
      };
    })().catch((e) => {
      cataloguePromise = null;
      throw e;
    });
  }

  return cataloguePromise;
}

// ---------- Bookings ----------

/** Error code returned by the database when the slot was taken meanwhile. */
export const BOOKING_SLOT_TAKEN = "BOOKING_SLOT_TAKEN";

export class BookingError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message || code);
    this.name = "BookingError";
    this.code = code;
  }
}

export function isSlotTakenError(e: unknown): boolean {
  return e instanceof BookingError && e.code === BOOKING_SLOT_TAKEN;
}

/**
 * Creates a booking through the atomic `create_booking` RPC.
 * Price, duration, service name and professional name are resolved by the
 * database; anything the client sends for those fields is ignored.
 */
export async function createBooking(b: BookingUI): Promise<BookingUI> {
  const catalogue = await loadCatalogue();

  const svc =
    catalogue.services.find((s) => s.slug === b.service) ||
    catalogue.services.find((s) => s.name === b.service) ||
    null;

  if (!svc) {
    throw new BookingError("SERVICE_NOT_AVAILABLE");
  }

  const wantsAny = !b.barber || b.barber === "any";
  const staff = wantsAny
    ? null
    : catalogue.staff.find(
        (s) => s.name === b.barber || s.slug === b.barber || s.id === b.barber,
      ) || null;

  if (!wantsAny && !staff) {
    throw new BookingError("STAFF_NOT_AVAILABLE");
  }

  const { data, error } = await supabase.rpc("create_booking", {
    _customer_name: b.name,
    _phone: b.phone,
    _email: b.email || null,
    _service_id: svc.id,
    _staff_id: staff ? staff.id : null,
    _appointment_date: b.date,
    _appointment_time: b.time,
    _comments: b.comments || null,
  });

  if (error) {
    console.error("[supabase] create_booking failed", error);

    const message = String(error.message || "");
    const known = [
      BOOKING_SLOT_TAKEN,
      "SERVICE_NOT_AVAILABLE",
      "STAFF_NOT_AVAILABLE",
      "OUTSIDE_OPENING_HOURS",
      "SLOT_IN_THE_PAST",
      "INVALID_CUSTOMER_NAME",
      "INVALID_PHONE",
      "INVALID_EMAIL",
      "INVALID_SLOT",
    ].find((code) => message.includes(code));

    throw new BookingError(known || "BOOKING_FAILED", message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) throw new BookingError("BOOKING_FAILED");

  return {
    ...b,
    id: row.id,
    service: svc.slug,
    barber: row.staff_name || b.barber,
    price:
      row.service_price === null || row.service_price === undefined
        ? null
        : Number(row.service_price),
    agreedPrice: null,
    pricePending:
      row.service_price === null || row.service_price === undefined,
    durationIsEstimate: true,
    paymentMethod: "cash_in_person",
    duration: Number(row.service_duration) || svc.duration,
    status: cleanStatus(row.status),
    business_id: getCurrentBusinessId(),
  };
}

export async function listBookings(
  businessId?: string | null,
): Promise<{ data: BookingUI[]; source: Source }> {
  const biz = businessId !== undefined ? businessId : getCurrentBusinessId();

  try {
    if (!(await hasAuthenticatedSession())) {
      const { data, error } = await supabase.rpc("get_public_booking_slots", {
        _business_id: biz || null,
      });

      if (error) throw error;

      return {
        data: (data || []).map(publicSlotToBooking),
        source: "supabase",
      };
    }

    let q = supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (biz) q = q.eq("business_id", biz);

    const { data, error } = await q;

    if (error) throw error;

    return { data: (data || []).map(rowToBooking), source: "supabase" };
  } catch (e) {
    console.warn("[supabase] listBookings failed, using localStorage", e);
    return { data: lsGet<BookingUI>(BK), source: "localStorage" };
  }
}

export async function updateBooking(
  b: BookingUI,
  changes: Partial<BookingUI>,
): Promise<BookingUI> {
  const updated: BookingUI = { ...b, ...changes };

  if (b.id) {
    const row = bookingToRow(updated);

    const { data, error } = await supabase
      .from("appointments")
      .update(row)
      .eq("id", b.id)
      .select("*")
      .single();

    if (error) {
      console.error("[supabase] updateBooking failed", error, row);

      const raw = `${(error as any).code || ""} ${error.message || ""} ${
        (error as any).details || ""
      }`;

      if (
        raw.includes("23P01") ||
        raw.includes("appointments_no_overlap") ||
        raw.includes("exclusion constraint")
      ) {
        throw new BookingError(BOOKING_SLOT_TAKEN, error.message);
      }

      throw error;
    }


    return rowToBooking(data);
  }

  const all = lsGet<BookingUI>(BK);
  const index = all.findIndex((x) => x.createdAt === b.createdAt);

  if (index >= 0) {
    all[index] = updated;
    lsSet(BK, all);
  }

  return updated;
}

export async function updateBookingStatus(
  b: BookingUI,
  status: BookingStatus,
): Promise<void> {
  await updateBooking(b, { status });
}

export async function deleteBooking(b: BookingUI): Promise<void> {
  if (b.id) {
    const { error } = await supabase.from("appointments").delete().eq("id", b.id);
    if (error) throw error;
    return;
  }

  const all = lsGet<BookingUI>(BK);
  lsSet(
    BK,
    all.filter((x) => x.createdAt !== b.createdAt),
  );
}

export async function markBookingReminderSent(b: BookingUI): Promise<void> {
  if (b.id) {
    const { error } = await supabase
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", b.id);

    if (error) throw error;
    return;
  }

  const all = lsGet<BookingUI>(BK);
  const index = all.findIndex((x) => x.createdAt === b.createdAt);

  if (index >= 0) {
    all[index] = {
      ...all[index],
      reminder_sent: true,
      reminder_time: Date.now(),
      reminder_channel: all[index].reminder_channel || "email",
    };

    lsSet(BK, all);
  }
}

// ---------- Walk-ins ----------

export async function createWalkin(name: string, phone = ""): Promise<WalkinUI> {
  const biz = getCurrentBusinessId();

  try {
    const localQueue = lsGet<WalkinUI>(WK);
    const estimatedWait =
      (localQueue.filter((w) => (w.status || "waiting") === "waiting").length + 1) * 15;

    const insertRow: Record<string, any> = {
      customer_name: name,
      phone: phone || "",
      estimated_wait_minutes: estimatedWait,
      status: "waiting",
    };

    if (biz) insertRow.business_id = biz;

    const { error } = await supabase
      .from("walkins")
      .insert([insertRow]);

    if (error) throw error;

    return {
      id: Date.now(),
      name,
      phone,
      createdAt: Date.now(),
      attended: false,
      status: "waiting",
      estimated_wait_minutes: estimatedWait,
      business_id: biz || null,
    };
  } catch (e) {
    console.warn("[supabase] createWalkin failed, fallback to localStorage", e);

    const all = lsGet<WalkinUI>(WK);
    const waiting = all.filter((w) => (w.status || "waiting") === "waiting").length;

    const local: WalkinUI = {
      id: Date.now(),
      name,
      phone,
      createdAt: Date.now(),
      attended: false,
      status: "waiting",
      estimated_wait_minutes: (waiting + 1) * 15,
    };

    all.push(local);
    lsSet(WK, all);

    return local;
  }
}

export async function listWalkins(
  businessId?: string | null,
): Promise<{ data: WalkinUI[]; source: Source }> {
  const biz = businessId !== undefined ? businessId : getCurrentBusinessId();

  try {
    let q = supabase
      .from("walkins")
      .select("*")
      .order("joined_at", { ascending: true });

    if (biz) q = q.eq("business_id", biz);

    const { data, error } = await q;

    if (error) throw error;

    return { data: (data || []).map(rowToWalkin), source: "supabase" };
  } catch (e) {
    console.warn("[supabase] listWalkins failed, using localStorage", e);
    return { data: lsGet<WalkinUI>(WK), source: "localStorage" };
  }
}

export async function updateWalkin(
  w: WalkinUI,
  changes: Partial<WalkinUI>,
): Promise<WalkinUI> {
  const updated: WalkinUI = { ...w, ...changes };

  if (w.id && typeof w.id === "string") {
    const row: Record<string, any> = {};

    if (changes.name !== undefined) row.customer_name = changes.name;
    if (changes.phone !== undefined) row.phone = changes.phone;
    if (changes.status !== undefined) row.status = changes.status;
    if (changes.estimated_wait_minutes !== undefined) {
      row.estimated_wait_minutes = changes.estimated_wait_minutes;
    }

    const { data, error } = await supabase
      .from("walkins")
      .update(row)
      .eq("id", w.id)
      .select("*")
      .single();

    if (error) {
      console.error("[supabase] updateWalkin failed", error, row);
      throw error;
    }

    await recalculateWalkinQueue(w.business_id || getCurrentBusinessId());

    return rowToWalkin(data);
  }

  const all = lsGet<WalkinUI>(WK);
  const index = all.findIndex((x) => x.id === w.id);

  if (index >= 0) {
    all[index] = {
      ...updated,
      attended: updated.status === "served",
    };

    lsSet(WK, all);
  }

  return updated;
}

export async function updateWalkinStatus(
  w: WalkinUI,
  status: WalkinStatus,
): Promise<void> {
  await updateWalkin(w, {
    status,
    attended: status === "served",
  });
}

export async function deleteWalkin(w: WalkinUI): Promise<void> {
  if (w.id && typeof w.id === "string") {
    const { error } = await supabase.from("walkins").delete().eq("id", w.id);

    if (error) throw error;

    await recalculateWalkinQueue(w.business_id || getCurrentBusinessId());
    return;
  }

  const all = lsGet<WalkinUI>(WK);
  lsSet(
    WK,
    all.filter((x) => x.id !== w.id),
  );
}

export async function attendNextWalkin(
  businessId?: string | null,
): Promise<WalkinUI | null> {
  const biz = businessId !== undefined ? businessId : getCurrentBusinessId();

  const { data } = await listWalkins(biz);

  const next = data
    .filter((w) => (w.status || "waiting") === "waiting")
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))[0];

  if (!next) return null;

  await updateWalkinStatus(next, "served");

  return {
    ...next,
    status: "served",
    attended: true,
  };
}

export async function recalculateWalkinQueue(
  businessId?: string | null,
): Promise<void> {
  const biz = businessId !== undefined ? businessId : getCurrentBusinessId();

  try {
    let q = supabase
      .from("walkins")
      .select("*")
      .eq("status", "waiting")
      .order("joined_at", { ascending: true });

    if (biz) q = q.eq("business_id", biz);

    const { data, error } = await q;

    if (error) throw error;

    await Promise.all(
      (data || []).map((w, index) =>
        supabase
          .from("walkins")
          .update({ estimated_wait_minutes: (index + 1) * 15 })
          .eq("id", w.id),
      ),
    );
  } catch (e) {
    console.warn("[supabase] recalculateWalkinQueue failed", e);
  }
}

// ---------- Reminders ----------

export async function listReminders(
  businessId?: string | null,
): Promise<{ data: ReminderUI[]; source: Source }> {
  const biz = businessId !== undefined ? businessId : getCurrentBusinessId();

  try {
    let q = supabase
      .from("reminders")
      .select("*")
      .order("created_at", { ascending: false });

    if (biz) q = q.eq("business_id", biz);

    const { data, error } = await q;

    if (error) throw error;

    return { data: (data || []).map(rowToReminder), source: "supabase" };
  } catch (e) {
    console.warn("[supabase] listReminders failed", e);
    return { data: [], source: "localStorage" };
  }
}

export async function createReminderLog(
  reminder: ReminderUI,
): Promise<ReminderUI> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      id: crypto.randomUUID(),
      appointment_id: reminder.appointment_id || null,
      customer_name: reminder.customer_name || "",
      email: reminder.email || "",
      phone: reminder.phone || "",
      appointment_date: reminder.appointment_date || null,
      appointment_time: reminder.appointment_time || null,
      reminder_time: reminder.reminder_time || nowIso,
      channel: reminder.channel || "email",
      status: reminder.status || "sent",
      message: reminder.message || "",
      created_at: reminder.created_at || nowIso,
      business_id: reminder.business_id || null,
      sent_at: reminder.sent_at || nowIso,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[supabase] createReminderLog failed", error);
    throw error;
  }

  return rowToReminder(data);
}

// ---------- Reviews ----------

export type ReviewUI = {
  id?: string;
  name: string;
  role: string;
  rating: number;
  comment: string;
  is_active: boolean;
  created_at: string;
};

function rowToReview(row: any): ReviewUI {
  return {
    id: row.id,
    name: row.name || "",
    role: row.role || "",
    rating: Number(row.rating) || 0,
    comment: row.comment || "",
    is_active: row.is_active === true,
    created_at: row.created_at || "",
  };
}

export async function listReviews(): Promise<{ data: ReviewUI[]; source: Source }> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, name, role, rating, comment, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[supabase] listReviews failed", error);
      throw error;
    }

    return { data: (data || []).map(rowToReview), source: "supabase" };
  } catch (e) {
    console.error("[reviews] failed to load reviews", e);
    return { data: [], source: "localStorage" };
  }
}
