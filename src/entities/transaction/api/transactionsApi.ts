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

/**
 * Get monthly totals centered around a reference date.
 * Returns 12 months of data: 6 before and 6 after (or up to current month).
 */
export async function getMonthlyTotals(
  referenceDate: Date = new Date(),
  monthsBack: number = 6
): Promise<{ month: string; expenses: number; income: number }[]> {
  const supabase = createClient();

  // Calculate date range
  const start = new Date(referenceDate);
  start.setMonth(start.getMonth() - monthsBack);
  start.setDate(1);

  const end = new Date(referenceDate);
  end.setMonth(end.getMonth() + 6);
  end.setDate(0); // last day of previous month

  // Cap at current month
  const now = new Date();
  const endCapped = end > now ? now : end;

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .gte("transaction_date", start.toISOString())
    .lte("transaction_date", endCapped.toISOString());

  if (error) throw error;

  // Group by month
  const monthMap = new Map<string, { expenses: number; income: number }>();

  for (const t of data ?? []) {
    const d = new Date(t.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) ?? { expenses: 0, income: 0 };
    if (t.type === "expense") {
      entry.expenses += t.amount;
    } else {
      entry.income += t.amount;
    }
    monthMap.set(key, entry);
  }

  // Sort and return
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({ month, ...totals }));
}
