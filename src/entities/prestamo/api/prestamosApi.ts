import { createClient } from "@/src/shared/api/supabase/client";
import type { Prestamo, PrestamoPayment, PrestamoType, PrestamoStatus } from "../model/types";

export async function getPrestamos(filters?: {
  type?: PrestamoType;
  status?: PrestamoStatus;
}): Promise<Prestamo[]> {
  const supabase = createClient();
  let query = supabase
    .from("prestamos")
    .select("*, payments:prestamo_payments(*)")
    .order("created_at", { ascending: false });

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Prestamo[];
}

export async function createPrestamo(input: {
  type: PrestamoType;
  contact_name: string;
  amount: number;
  start_date: string;
  expected_return_date?: string | null;
  notes?: string | null;
}): Promise<Prestamo> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("prestamos")
    .insert({
      user_id: user.id,
      type: input.type,
      contact_name: input.contact_name,
      amount: input.amount,
      start_date: input.start_date,
      expected_return_date: input.expected_return_date ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Prestamo;
}

export async function updatePrestamo(
  id: string,
  updates: Partial<Pick<Prestamo, "contact_name" | "amount" | "expected_return_date" | "notes" | "status">>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("prestamos")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deletePrestamo(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("prestamos")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function addPayment(input: {
  prestamo_id: string;
  amount: number;
  payment_date: string;
  notes?: string | null;
}): Promise<PrestamoPayment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prestamo_payments")
    .insert({
      prestamo_id: input.prestamo_id,
      amount: input.amount,
      payment_date: input.payment_date,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-update prestamo status
  await recalculateStatus(input.prestamo_id);

  return data as PrestamoPayment;
}

export async function deletePayment(paymentId: string, prestamoId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("prestamo_payments")
    .delete()
    .eq("id", paymentId);

  if (error) throw error;

  await recalculateStatus(prestamoId);
}

async function recalculateStatus(prestamoId: string): Promise<void> {
  const supabase = createClient();

  const { data: prestamo } = await supabase
    .from("prestamos")
    .select("amount")
    .eq("id", prestamoId)
    .single();

  const { data: payments } = await supabase
    .from("prestamo_payments")
    .select("amount")
    .eq("prestamo_id", prestamoId);

  if (!prestamo) return;

  const totalPaid = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  let status: "pending" | "partial" | "completed" = "pending";
  if (totalPaid >= prestamo.amount) {
    status = "completed";
  } else if (totalPaid > 0) {
    status = "partial";
  }

  await supabase
    .from("prestamos")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", prestamoId);
}

export async function getDistinctContacts(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prestamos")
    .select("contact_name")
    .order("contact_name");

  if (error) throw error;
  return [...new Set((data ?? []).map((d) => d.contact_name))];
}
