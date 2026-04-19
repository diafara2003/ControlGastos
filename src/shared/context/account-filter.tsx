"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/src/shared/api/supabase/client";

export interface BankAccountInfo {
  id: string;
  identifier: string;
  bank_name: string;
  label: string | null;
  is_tracked: boolean;
}

interface AccountFilterContextType {
  /** "all" or a specific card identifier like "3181" */
  selectedAccount: string;
  setSelectedAccount: (id: string) => void;
  accounts: BankAccountInfo[];
  hasMultipleAccounts: boolean;
  /** Reload accounts from DB (call after settings change) */
  reloadAccounts: () => Promise<void>;
}

const AccountFilterContext = createContext<AccountFilterContextType>({
  selectedAccount: "all",
  setSelectedAccount: () => {},
  accounts: [],
  hasMultipleAccounts: false,
  reloadAccounts: async () => {},
});

export function AccountFilterProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [accounts, setAccounts] = useState<BankAccountInfo[]>([]);

  const reloadAccounts = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("bank_accounts")
      .select("id, identifier, bank_name, label, is_tracked")
      .eq("user_id", user.id)
      .order("created_at");
    if (data) {
      setAccounts(data);
    }
  }, []);

  useEffect(() => {
    reloadAccounts();
  }, [reloadAccounts]);

  // Listen for account config changes
  useEffect(() => {
    const handler = () => reloadAccounts();
    window.addEventListener("bank-accounts-updated", handler);
    return () => window.removeEventListener("bank-accounts-updated", handler);
  }, [reloadAccounts]);

  const hasMultipleAccounts = accounts.length >= 2;

  return (
    <AccountFilterContext.Provider value={{ selectedAccount, setSelectedAccount, accounts, hasMultipleAccounts, reloadAccounts }}>
      {children}
    </AccountFilterContext.Provider>
  );
}

export function useAccountFilter() {
  return useContext(AccountFilterContext);
}

/**
 * Filter transactions based on the selected account.
 * "all" = show everything, otherwise filter by card_last_four.
 */
export function filterByAccount<T extends { card_last_four: string | null }>(
  items: T[],
  selectedAccount: string
): T[] {
  if (selectedAccount === "all") return items;
  return items.filter((t) => t.card_last_four === selectedAccount);
}
