import { chatCompletion } from "@/src/shared/api/azure-openai";
import { BUILTIN_RULES } from "./rules";
import { createServiceClient } from "@/src/shared/api/supabase/service";
import type { ParsedTransaction } from "@/src/features/sync-emails/lib/patterns";

export interface ClassificationResult {
  categoryName: string;
  method: "rule" | "builtin" | "ai" | "none";
}

/**
 * Classify a parsed transaction through the pipeline:
 * 1. User-defined rules (from DB)
 * 2. Built-in keyword rules
 * 3. Azure OpenAI fallback
 */
export async function classifyTransaction(
  transaction: ParsedTransaction,
  userId: string
): Promise<ClassificationResult> {
  const searchText =
    `${transaction.merchant} ${transaction.description ?? ""}`.toLowerCase();

  // Level 1: User-defined rules
  const supabase = createServiceClient();
  const { data: userRules } = await supabase
    .from("classification_rules")
    .select("pattern, category:categories(name)")
    .eq("user_id", userId)
    .order("priority", { ascending: false });

  if (userRules) {
    for (const rule of userRules) {
      const pattern = (rule.pattern as string).toLowerCase();
      if (searchText.includes(pattern)) {
        // Supabase join returns object or array depending on relation
        const cat = rule.category as unknown as { name: string } | { name: string }[] | null;
        const catName = Array.isArray(cat)
          ? cat[0]?.name ?? "Otros"
          : cat?.name ?? "Otros";
        return { categoryName: catName, method: "rule" };
      }
    }
  }

  // Level 2: Built-in rules
  for (const [categoryName, keywords] of Object.entries(BUILTIN_RULES)) {
    if (keywords.some((kw) => searchText.includes(kw))) {
      return { categoryName, method: "builtin" };
    }
  }

  // Level 3: Azure OpenAI
  try {
    const categories = Object.keys(BUILTIN_RULES).join(", ");
    const response = await chatCompletion(
      [
        {
          role: "system",
          content: `Clasifica esta transacción en UNA de estas categorías: ${categories}, Transferencias, Otros.
Responde SOLO con el nombre exacto de la categoría, sin explicación.`,
        },
        {
          role: "user",
          content: `Comercio: ${transaction.merchant}
Descripción: ${transaction.description ?? "N/A"}
Monto: $${transaction.amount}
Tipo: ${transaction.type}`,
        },
      ],
      { temperature: 0, maxTokens: 50 }
    );

    const categoryName = response.trim();
    // Validate it's a known category
    const allCategories = [
      ...Object.keys(BUILTIN_RULES),
      "Transferencias",
      "Otros",
    ];
    if (allCategories.includes(categoryName)) {
      return { categoryName, method: "ai" };
    }
  } catch {
    // AI unavailable, fall through
  }

  // Fallback
  return { categoryName: "Otros", method: "none" };
}
