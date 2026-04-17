"use client";

import { Button } from "@/src/shared/ui/button";
import { CreditCard } from "lucide-react";
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
  return (
    <div className="space-y-3">
      {/* Type filter */}
      <div className="flex gap-2">
        <Button
          variant={selectedType === null ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeChange(null)}
        >
          Todos
        </Button>
        <Button
          variant={selectedType === "expense" ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeChange("expense")}
        >
          Gastos
        </Button>
        <Button
          variant={selectedType === "income" ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeChange("income")}
        >
          Ingresos
        </Button>
      </div>

      {/* Card filter */}
      {cards && cards.length > 0 && onCardChange && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant={selectedCard === null ? "default" : "outline"}
            size="sm"
            onClick={() => onCardChange(null)}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Todas
          </Button>
          {cards.map((card) => (
            <Button
              key={card}
              variant={selectedCard === card ? "default" : "outline"}
              size="sm"
              onClick={() => onCardChange(card)}
              className="whitespace-nowrap"
            >
              *{card}
            </Button>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(null)}
        >
          Todas
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(cat.id)}
            className="whitespace-nowrap"
          >
            {cat.icon} {cat.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
