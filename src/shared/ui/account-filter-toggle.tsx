"use client";

import { useAccountFilter } from "@/src/shared/context/account-filter";
import { getBankBrand } from "@/src/shared/config/bank-brands";

export function AccountFilterToggle() {
  const { selectedAccount, setSelectedAccount, accounts, hasMultipleAccounts } = useAccountFilter();

  // Only show tracked accounts in the toggle
  const trackedAccounts = accounts.filter((a) => a.is_tracked);

  if (!hasMultipleAccounts || trackedAccounts.length < 1) return null;

  // Only show toggle if there are 2+ tracked accounts
  if (trackedAccounts.length < 2 && selectedAccount === "all") return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {trackedAccounts.length >= 2 && (
        <button
          onClick={() => setSelectedAccount("all")}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            selectedAccount === "all"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          Todas
        </button>
      )}
      {trackedAccounts.map((acc) => {
        const brand = getBankBrand(acc.bank_name);
        const isActive = selectedAccount === acc.identifier;
        return (
          <button
            key={acc.id}
            onClick={() => setSelectedAccount(acc.identifier)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive
                ? "text-white"
                : "bg-gray-100 text-gray-500"
            }`}
            style={isActive ? { backgroundColor: brand.color, color: brand.textColor } : undefined}
          >
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded text-[8px] font-bold shrink-0"
              style={
                isActive
                  ? { backgroundColor: "rgba(255,255,255,0.3)", color: "inherit" }
                  : { backgroundColor: brand.bgColor, color: brand.textColor }
              }
            >
              {brand.initials}
            </span>
            {acc.label ?? `*${acc.identifier}`}
          </button>
        );
      })}
    </div>
  );
}
