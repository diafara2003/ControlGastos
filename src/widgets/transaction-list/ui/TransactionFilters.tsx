"use client";

import { useState } from "react";
import { CreditCard, ChevronDown, SlidersHorizontal, Search } from "lucide-react";
import { LucideIcon } from "@/src/shared/ui/lucide-icon";
import { cn } from "@/src/shared/lib/cn";
import type { Category } from "@/src/entities/category";

interface TransactionFiltersProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  selectedType: "expense" | "income" | null;
  onTypeChange: (type: "expense" | "income" | null) => void;
  cards?: string[];
  selectedCard?: string | null;
  onCardChange?: (card: string | null) => void;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95"
      )}
    >
      {children}
    </button>
  );
}

export function TransactionFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  cards,
  selectedCard,
  onCardChange,
}: TransactionFiltersProps) {
  const [showCategories, setShowCategories] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const activeFilters =
    (selectedType ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedCard ? 1 : 0);

  return (
    <div className="space-y-2">
      {/* Row 1: Type + Card + expand button */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <Chip active={selectedType === null} onClick={() => onTypeChange(null)}>
          Todo
        </Chip>
        <Chip
          active={selectedType === "expense"}
          onClick={() => onTypeChange(selectedType === "expense" ? null : "expense")}
        >
          Gastos
        </Chip>
        <Chip
          active={selectedType === "income"}
          onClick={() => onTypeChange(selectedType === "income" ? null : "income")}
        >
          Ingresos
        </Chip>

        {/* Divider */}
        {cards && cards.length > 0 && (
          <>
            <div className="h-4 w-px bg-gray-200 flex-shrink-0" />
            {cards.map((card) => (
              <Chip
                key={card}
                active={selectedCard === card}
                onClick={() => onCardChange?.(selectedCard === card ? null : card)}
              >
                <CreditCard className="h-3 w-3" />*{card}
              </Chip>
            ))}
          </>
        )}

        {/* Categories toggle */}
        <div className="h-4 w-px bg-gray-200 flex-shrink-0" />
        <button
          onClick={() => setShowCategories(!showCategories)}
          className={cn(
            "flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            showCategories || selectedCategory
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          )}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Categoría
          {selectedCategory && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] text-white">
              1
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              showCategories && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Row 2: Categories (collapsible with search) */}
      {showCategories && (
        <div className="space-y-2 animate-fade-up">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Buscar categoria..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
            {categories
              .filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()))
              .map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onCategoryChange(selectedCategory === cat.id ? null : cat.id);
                      setCatSearch("");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all border",
                      isActive
                        ? "text-white border-current"
                        : "border-gray-100 text-gray-700 active:scale-95"
                    )}
                    style={isActive ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
                  >
                    <LucideIcon name={cat.icon} size={12} color={isActive ? "white" : cat.color} />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {activeFilters > 0 && (
        <button
          onClick={() => {
            onTypeChange(null);
            onCategoryChange(null);
            onCardChange?.(null);
          }}
          className="text-[11px] text-emerald-600 hover:underline"
        >
          Limpiar {activeFilters} filtro{activeFilters > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
