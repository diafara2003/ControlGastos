/**
 * Built-in classification rules.
 * Maps keywords (lowercase) to category names.
 */
export const BUILTIN_RULES: Record<string, string[]> = {
  Suscripciones: [
    "netflix", "spotify", "amazon prime", "disney", "hbo", "apple",
    "youtube premium", "microsoft 365", "google one", "chatgpt", "openai",
    "crunchyroll", "paramount", "deezer", "icloud", "apple.com/bill",
  ],
  "Compras online": [
    "mercadolibre", "mercado libre", "amazon", "aliexpress", "shein",
    "falabella", "linio", "ebay", "wish", "temu",
  ],
  Supermercado: [
    "éxito", "exito", "carulla", "jumbo", "olímpica", "olimpica",
    "d1", "ara", "justo & bueno", "surtimax", "metro", "makro",
    "supermercado", "supertienda", "tienda",
  ],
  Restaurantes: [
    "rappi", "ifood", "domicilios", "uber eats", "didi food",
    "mcdonald", "burger king", "subway", "starbucks", "juan valdez",
    "crepes", "restaurante", "rest ", "comida", "pizza", "pollo",
  ],
  Transporte: [
    "uber", "didi", "beat", "indriver", "cabify", "taxi",
    "sitp", "transmilenio", "metro medellín", "mio cali",
    "gasolina", "terpel", "primax", "mobil", "peaje",
  ],
  "Servicios públicos": [
    "epm", "codensa", "enel", "vanti", "gas natural",
    "etb", "claro", "movistar", "tigo", "wom",
    "acueducto", "aseo", "internet",
  ],
  Salud: [
    "farmacia", "droguerías", "droguería", "locatel", "farmatodo",
    "eps", "colsanitas", "sura eps", "coomeva", "médico", "medico",
    "hospital", "clínica", "clinica", "dental",
  ],
  Entretenimiento: [
    "cine", "cinecolombia", "cinemark", "procinal",
    "parque", "teatro", "boleta", "tuboleta", "juego",
  ],
  Educación: [
    "universidad", "uniandes", "javeriana", "nacional",
    "udemy", "coursera", "platzi", "educación", "colegio", "sena",
  ],
  Efectivo: [
    "cajero", "retiro", "atm",
  ],
  Transferencias: [
    "transferencia",
  ],
  Ingresos: [
    "nómina", "nomina", "salario", "sueldo", "pago de",
  ],
};

/**
 * Smart classification that also considers transaction type and description.
 * Returns category name or null if no match.
 */
export function classifyByRules(
  merchant: string,
  description: string | null | undefined,
  type: "income" | "expense"
): { categoryName: string; method: "builtin" } | null {
  const searchText = `${merchant} ${description ?? ""}`.toLowerCase();

  // Check keyword rules first
  for (const [categoryName, keywords] of Object.entries(BUILTIN_RULES)) {
    if (keywords.some((kw) => searchText.includes(kw))) {
      return { categoryName, method: "builtin" };
    }
  }

  // Type-based fallback rules
  if (type === "income") {
    // Any income that mentions a person's name or "recibiste" = Transferencias
    if (
      searchText.includes("recibiste") ||
      searchText.includes("recibida") ||
      searchText.includes("abono") ||
      searchText.includes("consignación") ||
      searchText.includes("consignacion")
    ) {
      return { categoryName: "Transferencias", method: "builtin" };
    }
    // Default income = Ingresos
    return { categoryName: "Ingresos", method: "builtin" };
  }

  // Expense-based fallback: if description mentions "compra" → Compras online
  if (type === "expense") {
    if (searchText.includes("compra")) {
      return { categoryName: "Compras online", method: "builtin" };
    }
    if (searchText.includes("pago")) {
      return { categoryName: "Servicios públicos", method: "builtin" };
    }
    if (searchText.includes("débito automático") || searchText.includes("debito automatico")) {
      return { categoryName: "Servicios públicos", method: "builtin" };
    }
  }

  return null;
}
