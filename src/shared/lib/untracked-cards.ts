import { createClient } from "@/src/shared/api/supabase/client";

/**
 * Get the set of card identifiers that the user has marked as untracked.
 * Used to filter out transactions from excluded accounts.
 */
export async function getUntrackedCards(userId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bank_accounts")
    .select("identifier, is_tracked")
    .eq("user_id", userId);

  if (!data) return new Set();
  return new Set(data.filter((a) => !a.is_tracked).map((a) => a.identifier));
}

/**
 * Check if a transaction's card is untracked.
 */
export function isUntracked(cardLastFour: string | null, untrackedCards: Set<string>): boolean {
  if (!cardLastFour) return false;
  return untrackedCards.has(cardLastFour);
}
