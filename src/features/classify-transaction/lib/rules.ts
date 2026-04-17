/**
 * Built-in classification rules.
 * Maps keywords (lowercase) to category names.
 */
export const BUILTIN_RULES: Record<string, string[]> = {
  Suscripciones: [
    "netflix", "spotify", "amazon prime", "disney", "hbo", "apple",
    "youtube premium", "microsoft 365", "google one", "chatgpt", "openai",
    "crunchyroll", "paramount", "deezer", "icloud",
  ],
  "Compras online": [
    "mercadolibre", "mercado libre", "amazon", "aliexpress", "shein",
    "falabella", "linio", "ebay",
  ],
  Supermercado: [
    "éxito", "exito", "carulla", "jumbo", "olímpica", "olimpica",
    "d1", "ara", "justo & bueno", "surtimax", "metro",
  ],
  Restaurantes: [
    "rappi", "ifood", "domicilios", "uber eats", "didi food",
    "mcdonald", "burger king", "subway", "starbucks", "juan valdez",
    "crepes", "restaurante", "rest ",
  ],
  Transporte: [
    "uber", "didi", "beat", "indriver", "cabify", "taxi",
    "sitp", "transmilenio", "metro medellín", "mio cali",
    "gasolina", "terpel", "primax", "mobil",
  ],
  "Servicios públicos": [
    "epm", "codensa", "enel", "vanti", "gas natural",
    "etb", "claro", "movistar", "tigo", "wom",
    "acueducto", "aseo",
  ],
  Salud: [
    "farmacia", "droguerías", "droguería", "locatel", "farmatodo",
    "eps", "colsanitas", "sura eps", "coomeva",
  ],
  Entretenimiento: [
    "cine", "cinecolombia", "cinemark", "procinal",
    "parque", "teatro", "boleta", "tuboleta",
  ],
  Educación: [
    "universidad", "uniandes", "javeriana", "nacional",
    "udemy", "coursera", "platzi", "educación",
  ],
  Efectivo: [
    "cajero", "retiro", "atm",
  ],
  Ingresos: [
    "nómina", "nomina", "salario", "sueldo",
  ],
};
