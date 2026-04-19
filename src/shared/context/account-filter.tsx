"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { getBankBrand } from "@/src/shared/config/bank-brands";

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
}

const AccountFilterContext = createContext<AccountFilterContextType>({
  selectedAccount: "all",
  setSelectedAccount: () => {},
  accounts: [],
  hasMultipleAccounts: false,
});

export function AccountFilterProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [accounts, setAccounts] = useState<BankAccountInfo[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("bank_accounts")
        .select("id, identifier, bank_name, label, is_tracked")
        .eq("user_id", user.id)
        .order("created_at");
      if (data && data.length > 0) {
        setAccounts(data);
      }
    };
    load();
  }, []);

  const hasMultipleAccounts = accounts.length >= 2;

  return (
    <AccountFilterContext.Provider value={{ selectedAccount, setSelectedAccount, accounts, hasMultipleAccounts }}>
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
