"use client";

import { useState } from "react";
import { CreditCard, ChevronDown, SlidersHorizontal } from "lucide-react";
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

      {/* Row 2: Categories (collapsible) */}
      {showCategories && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide animate-fade-up">
          <Chip
            active={selectedCategory === null}
            onClick={() => onCategoryChange(null)}
          >
            Todas
          </Chip>
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              active={selectedCategory === cat.id}
              onClick={() =>
                onCategoryChange(selectedCategory === cat.id ? null : cat.id)
              }
            >
              <LucideIcon name={cat.icon} size={12} /> {cat.name}
            </Chip>
          ))}
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
