"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/src/shared/api/supabase/client";

export interface BankAccountInfo {
  id: string;
  identifier: string;
  bank_name: string;
  label: string | null;
  is_tracked: boolean;
  group_id: string | null;
}

/** Grouped account for display in the toggle */
export interface AccountGroup {
  /** Primary account ID */
  id: string;
  /** All card identifiers in this group */
  identifiers: string[];
  bank_name: string;
  label: string | null;
  is_tracked: boolean;
}

interface AccountFilterContextType {
  /** "all" or a group identifier (first card in the group) */
  selectedAccount: string;
  setSelectedAccount: (id: string) => void;
  accounts: BankAccountInfo[];
  /** Grouped accounts for display */
  groups: AccountGroup[];
  hasMultipleAccounts: boolean;
  reloadAccounts: () => Promise<void>;
}

const AccountFilterContext = createContext<AccountFilterContextType>({
  selectedAccount: "all",
  setSelectedAccount: () => {},
  accounts: [],
  groups: [],
  hasMultipleAccounts: false,
  reloadAccounts: async () => {},
});

function buildGroups(accounts: BankAccountInfo[]): AccountGroup[] {
  const groupMap = new Map<string, BankAccountInfo[]>();

  for (const acc of accounts) {
    const key = acc.group_id ?? acc.id; // ungrouped accounts use their own id
    const group = groupMap.get(key) ?? [];
    group.push(acc);
    groupMap.set(key, group);
  }

  return Array.from(groupMap.values()).map((members) => {
    const primary = members[0];
    return {
      id: primary.id,
      identifiers: members.map((m) => m.identifier),
      bank_name: primary.bank_name,
      label: primary.label,
      is_tracked: members.some((m) => m.is_tracked),
    };
  });
}

export function AccountFilterProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [accounts, setAccounts] = useState<BankAccountInfo[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);

  const reloadAccounts = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("bank_accounts")
      .select("id, identifier, bank_name, label, is_tracked, group_id")
      .eq("user_id", user.id)
      .order("created_at");
    if (data) {
      setAccounts(data);
      setGroups(buildGroups(data));
    }
  }, []);

  useEffect(() => {
    reloadAccounts();
  }, [reloadAccounts]);

  useEffect(() => {
    const handler = () => reloadAccounts();
    window.addEventListener("bank-accounts-updated", handler);
    return () => window.removeEventListener("bank-accounts-updated", handler);
  }, [reloadAccounts]);

  const hasMultipleAccounts = groups.length >= 2;

  return (
    <AccountFilterContext.Provider value={{ selectedAccount, setSelectedAccount, accounts, groups, hasMultipleAccounts, reloadAccounts }}>
      {children}
    </AccountFilterContext.Provider>
  );
}

export function useAccountFilter() {
  return useContext(AccountFilterContext);
}

/**
 * Filter transactions based on the selected account.
 * Supports grouped accounts — selecting one shows all cards in the group.
 */
export function filterByAccount<T extends { card_last_four: string | null }>(
  items: T[],
  selectedAccount: string,
  accounts?: BankAccountInfo[]
): T[] {
  if (selectedAccount === "all") {
    if (!accounts || accounts.length === 0) return items;
    const untrackedIds = new Set(
      accounts.filter((a) => !a.is_tracked).map((a) => a.identifier)
    );
    if (untrackedIds.size === 0) return items;
    return items.filter((t) => !t.card_last_four || !untrackedIds.has(t.card_last_four));
  }

  // Find all identifiers in the same group as selectedAccount
  if (accounts) {
    const selected = accounts.find((a) => a.identifier === selectedAccount);
    if (selected?.group_id) {
      const groupIds = new Set(
        accounts.filter((a) => a.group_id === selected.group_id).map((a) => a.identifier)
      );
      return items.filter((t) => t.card_last_four && groupIds.has(t.card_last_four));
    }
  }

  return items.filter((t) => t.card_last_four === selectedAccount);
}
