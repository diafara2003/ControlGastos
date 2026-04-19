"use client";

import { useAccountFilter } from "@/src/shared/context/account-filter";
import { getBankBrand } from "@/src/shared/config/bank-brands";

export function AccountFilterToggle() {
  const { selectedAccount, setSelectedAccount, groups, hasMultipleAccounts } = useAccountFilter();

  const trackedGroups = groups.filter((g) => g.is_tracked);

  if (!hasMultipleAccounts || trackedGroups.length < 2) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
      {trackedGroups.map((group) => {
        const brand = getBankBrand(group.bank_name);
        const isActive = group.identifiers.includes(selectedAccount);
        const displayId = group.identifiers.join("/");
        return (
          <button
            key={group.id}
            onClick={() => setSelectedAccount(group.identifiers[0])}
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
            {group.label ?? `*${displayId}`}
          </button>
        );
      })}
    </div>
  );
}
