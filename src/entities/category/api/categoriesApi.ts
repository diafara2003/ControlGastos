import { createClient } from "@/src/shared/api/supabase/client";
import type { Category } from "../model/types";

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Category[];
}

export async function getCategoryBreakdown(startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_category_breakdown", {
    start_date: startDate,
    end_date: endDate,
  });
  if (error) throw error;
  return data;
}
