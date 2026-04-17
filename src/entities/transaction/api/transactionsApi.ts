import { createClient } from "@/src/shared/api/supabase/client";
import type { Transaction } from "../model/types";

export async function getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: "expense" | "income";
  cardLastFour?: string;
}): Promise<Transaction[]> {
  const supabase = createClient();
  let query = supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .order("transaction_date", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("transaction_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("transaction_date", filters.endDate);
  }
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.cardLastFour) {
    query = query.eq("card_last_four", filters.cardLastFour);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Transaction[];
}

export async function getDistinctCards(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("card_last_four")
    .not("card_last_four", "is", null)
    .order("card_last_four");

  if (error) throw error;

  const unique = [...new Set((data ?? []).map((d) => d.card_last_four as string))];
  return unique;
}

export async function getMonthlyTotals(months: number = 6) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_monthly_totals", {
    num_months: months,
  });
  if (error) throw error;
  return data;
}
