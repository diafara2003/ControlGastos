"use client";

import { Button } from "@/src/shared/ui/button";
import type { Category } from "@/src/entities/category";

interface TransactionFiltersProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  selectedType: "expense" | "income" | null;
  onTypeChange: (type: "expense" | "income" | null) => void;
}

export function TransactionFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
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
