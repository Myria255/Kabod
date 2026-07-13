import { supabase } from "@/supabaseClient";

const TABLE = "donation_intents";

export type DonationGiftType = "offrande" | "dime" | "don" | "solidarite" | "mission" | "autre";
export type DonationFrequency = "once" | "monthly";
export type DonationPaymentMethod = "mobile_money" | "paypal" | "virement" | "especes" | "a_definir" | "autre";
export type DonationStatus = "new" | "contacted" | "completed" | "cancelled" | "archived";

export type DonationIntent = {
  id: string;
  userId: string | null;
  giftType: DonationGiftType;
  amount: number;
  currency: string;
  frequency: DonationFrequency;
  paymentMethod: DonationPaymentMethod;
  note: string | null;
  status: DonationStatus;
  createdAt: string;
  updatedAt: string | null;
};

type DonationIntentRow = {
  id?: string | null;
  user_id?: string | null;
  gift_type?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  frequency?: string | null;
  payment_method?: string | null;
  note?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CreateDonationIntentInput = {
  giftType: DonationGiftType;
  amount: number;
  currency?: string;
  frequency: DonationFrequency;
  paymentMethod: DonationPaymentMethod;
  note?: string | null;
};

const SELECT =
  "id, user_id, gift_type, amount, currency, frequency, payment_method, note, status, created_at, updated_at";

function normalizeGiftType(value: unknown): DonationGiftType {
  if (value === "dime" || value === "don" || value === "solidarite" || value === "mission" || value === "autre") {
    return value;
  }
  return "offrande";
}

function normalizeFrequency(value: unknown): DonationFrequency {
  return value === "monthly" ? "monthly" : "once";
}

function normalizePaymentMethod(value: unknown): DonationPaymentMethod {
  if (value === "mobile_money" || value === "paypal" || value === "virement" || value === "especes" || value === "autre") {
    return value;
  }
  return "a_definir";
}

function normalizeStatus(value: unknown): DonationStatus {
  if (value === "contacted" || value === "completed" || value === "cancelled" || value === "archived") return value;
  return "new";
}

function mapRow(row: DonationIntentRow | null | undefined): DonationIntent | null {
  if (!row?.id || !row.created_at) return null;

  return {
    id: row.id,
    userId: typeof row.user_id === "string" ? row.user_id : null,
    giftType: normalizeGiftType(row.gift_type),
    amount: Number(row.amount ?? 0),
    currency: typeof row.currency === "string" ? row.currency : "EUR",
    frequency: normalizeFrequency(row.frequency),
    paymentMethod: normalizePaymentMethod(row.payment_method),
    note: typeof row.note === "string" ? row.note : null,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Session requise.");
  return user.id;
}

export function giftTypeLabel(value: DonationGiftType) {
  if (value === "dime") return "Dîme";
  if (value === "don") return "Don libre";
  if (value === "solidarite") return "Solidarité";
  if (value === "mission") return "Mission";
  if (value === "autre") return "Autre";
  return "Offrande";
}

export function paymentMethodLabel(value: DonationPaymentMethod) {
  if (value === "mobile_money") return "Mobile Money";
  if (value === "paypal") return "PayPal";
  if (value === "virement") return "Virement";
  if (value === "especes") return "Espèces";
  if (value === "autre") return "Autre";
  return "À définir";
}

export function donationStatusLabel(value: DonationStatus) {
  if (value === "contacted") return "Contacté";
  if (value === "completed") return "Reçu";
  if (value === "cancelled") return "Annulé";
  if (value === "archived") return "Archivé";
  return "Nouveau";
}

export async function createDonationIntent(input: CreateDonationIntentInput): Promise<DonationIntent> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      gift_type: input.giftType,
      amount: input.amount,
      currency: input.currency ?? "EUR",
      frequency: input.frequency,
      payment_method: input.paymentMethod,
      note: input.note?.trim() || null,
    })
    .select(SELECT)
    .single();

  if (error) throw error;
  const donation = mapRow(data as DonationIntentRow);
  if (!donation) throw new Error("Intention de don introuvable.");
  return donation;
}

export async function getAdminDonationIntents(): Promise<DonationIntent[]> {
  const { data, error } = await supabase.from(TABLE).select(SELECT).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapRow(row as DonationIntentRow))
    .filter((row): row is DonationIntent => row !== null);
}

export async function updateDonationIntentStatus(id: string, status: DonationStatus): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ status }).eq("id", id);
  if (error) throw error;
}
