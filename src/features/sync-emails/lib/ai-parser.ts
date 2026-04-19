import { chatCompletion } from "@/src/shared/api/azure-openai";
import { generateEmbedding } from "@/src/shared/api/embeddings";
import { createServiceClient } from "@/src/shared/api/supabase/service";
import type { FetchedEmail } from "./gmail";
import type { ParsedTransaction } from "./patterns";

const SYSTEM_PROMPT = `Eres un parser de notificaciones bancarias colombianas.
Dado un email, determina si contiene una transacción financiera real (compra, pago, transferencia, retiro, consignación, nómina, extracto con valor a pagar, etc.).

Si el correo NO es una transacción financiera (es publicidad, información general, promociones, alertas de seguridad sin monto, etc.), responde:
{"error": "no_transaction"}

Si SÍ es una transacción, responde SOLO con un objeto JSON válido (sin markdown, sin explicación):
{
  "type": "expense" | "income",
  "amount": <número entero en COP>,
  "merchant": "<nombre del comercio, persona o entidad destinataria>",
  "description": "<descripción corta de la transacción>",
  "transactionDate": "<fecha ISO 8601>",
  "cardLastFour": "<últimos 4 dígitos de tarjeta o null>",
  "categoryName": "<categoría más apropiada>"
}

Categorías disponibles (usa EXACTAMENTE uno de estos nombres):
- Suscripciones (Netflix, Spotify, Amazon Prime, Disney+, etc.)
- Compras online (MercadoLibre, Amazon, AliExpress, Shein, etc.)
- Supermercado (Éxito, Carulla, Jumbo, Olímpica, D1, Ara, etc.)
- Restaurantes (Rappi, Uber Eats, McDonald's, restaurantes, comida)
- Transporte (Uber, Didi, gasolina, peajes, TransMilenio)
- Servicios públicos (EPM, Codensa, Claro, Movistar, internet, agua, gas)
- Salud (farmacias, EPS, hospitales, médicos)
- Entretenimiento (cine, teatro, boletas, juegos, Steam)
- Educación (universidad, Platzi, Coursera, colegios)
- Efectivo (pagos en efectivo, dinero en mano)
- Retiro cajero (retiros en cajeros automáticos, ATM, Servibanca, cajero red)
- Pago tarjeta crédito (pago cuota, pago anticipado, abono a tarjeta de crédito o préstamo)
- Transferencias (transferencias enviadas a personas)
- Ingresos (nómina, salario, consignaciones, transferencias recibidas)
- Otros (si no encaja en ninguna)

Reglas CRÍTICAS (nunca violar):
- IMPORTANTE: "compraste", "compra", "pago en", "pagaste" SIEMPRE es type = "expense", NUNCA income
- Si el correo dice "Compraste $X en COMERCIO" es un GASTO, no un ingreso
- amount siempre es positivo (entero, sin decimales)
- "compraste", "compra", "pago en", "pagaste" → type = "expense"
- "transferiste", "enviaste" → type = "expense", categoría = "Transferencias"
- "te enviaron", "recibiste", "abono", "consignación", "nómina" → type = "income"
- "retiraste", "retiro", "cajero", "ATM", "Servibanca" → type = "expense", categoría = "Retiro cajero"
- "pago anticipado", "pago cuota anticipada", "abono a tarjeta", "pago tarjeta" → type = "expense", categoría = "Pago tarjeta crédito"
- cardLastFour: extraer los últimos 4 dígitos de la cuenta o tarjeta. Formatos posibles: "*1036", "T.Deb *1036", "cuenta **3181", "cuenta Nro.******* 6635", "tarjeta ...4532"
- merchant debe ser el comercio, persona o entidad (NO el banco emisor)
- Si el merchant es un código raro (ej: KS*PAGSEGURO), intenta deducir el comercio real
- description debe ser útil y descriptiva (ej: "Compra en supermercado con débito *1036", "Pago de nómina SINCOSOFT", "Retiro cajero Servibanca"). NO repetir el asunto del correo ni poner "Alertas y Notificaciones"
- transactionDate debe extraerse del cuerpo del correo, no del header

Correos que NO son transacciones (responder con {"error": "no_transaction"}):
- Extractos mensuales que solo tienen PDF adjunto sin monto en el cuerpo del correo
- Correos duplicados: si dos correos tienen la misma referencia y fecha, el segundo es duplicado
- Publicidad, promociones, ofertas de crédito preaprobado, alertas de seguridad sin monto`;

/**
 * Parse a date string and ensure it represents midnight in Colombia (UTC-5).
 * If the AI returns just "2026-04-18", new Date() treats it as midnight UTC,
 * which is 7pm previous day in Colombia. This fixes that.
 */
function toColombiaDate(aiDate: string | undefined, emailDate: string): Date {
  const raw = aiDate || emailDate;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return new Date(emailDate);

  // If it's a date-only string (no time component), add Colombia offset
  if (aiDate && /^\d{4}-\d{2}-\d{2}$/.test(aiDate.trim())) {
    return new Date(d.getTime() + 5 * 60 * 60 * 1000); // UTC midnight + 5h = COT midnight
  }

  return d;
}

export interface AIParseResult extends ParsedTransaction {
  categoryName: string;
  classificationMethod: "ai" | "pattern";
  excludeFromTotals: boolean;
}

interface UserRuleMatch {
  category: string;
  includeInExpenses: boolean;
  includeInIncome: boolean;
}

/**
 * Check user-specific rules first (per-user RAG).
 * These take highest priority.
 */
async function matchUserRule(
  merchant: string,
  userId: string
): Promise<UserRuleMatch | null> {
  try {
    const normalized = merchant.toLowerCase().trim();
    if (normalized.length < 3) return null;

    const supabase = createServiceClient();

    // Step 1: Text match on user rules
    const { data } = await supabase
      .from("user_rules")
      .select("merchant_pattern, category_name, include_in_expenses, include_in_income")
      .eq("user_id", userId);

    if (data) {
      for (const r of data) {
        if (
          normalized.includes(r.merchant_pattern) ||
          r.merchant_pattern.includes(normalized)
        ) {
          console.log(`User rule match (text): "${normalized}" → ${r.category_name}`);
          return {
            category: r.category_name,
            includeInExpenses: r.include_in_expenses,
            includeInIncome: r.include_in_income,
          };
        }
      }
    }

    // Step 2: Semantic match via embedding
    try {
      const embedding = await generateEmbedding(normalized);
      const { data: matches } = await supabase.rpc("match_user_rule", {
        p_user_id: userId,
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.80,
        match_count: 1,
      });

      if (matches && matches.length > 0) {
        const best = matches[0];
        console.log(
          `User rule match (RAG): "${normalized}" ≈ "${best.merchant_pattern}" → ${best.category_name} (${(best.similarity * 100).toFixed(1)}%)`
        );
        return {
          category: best.category_name,
          includeInExpenses: best.include_in_expenses,
          includeInIncome: best.include_in_income,
        };
      }
    } catch {
      // RAG best-effort
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a merchant matches a learned classification pattern.
 * 1. First tries exact text matching (fast, no API call)
 * 2. Falls back to semantic search via embeddings (RAG)
 * Returns the category name or null.
 */
async function matchPattern(merchant: string): Promise<{ category: string; method: "pattern" } | null> {
  try {
    const normalized = merchant.toLowerCase().trim();
    if (normalized.length < 3) return null;

    const supabase = createServiceClient();

    // Step 1: Exact text match
    const { data } = await supabase
      .from("classification_patterns")
      .select("merchant_pattern, category_name, confidence")
      .gte("confidence", 0.5)
      .order("confidence", { ascending: false });

    if (data) {
      for (const p of data) {
        if (
          normalized.includes(p.merchant_pattern) ||
          p.merchant_pattern.includes(normalized)
        ) {
          console.log(`Pattern match (text): "${normalized}" → ${p.category_name}`);
          return { category: p.category_name, method: "pattern" };
        }
      }
    }

    // Step 2: Semantic search via embeddings (RAG)
    try {
      const embedding = await generateEmbedding(normalized);
      const { data: matches } = await supabase.rpc("match_merchant_embedding", {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.78,
        match_count: 1,
      });

      if (matches && matches.length > 0) {
        const best = matches[0];
        console.log(
          `Pattern match (RAG): "${normalized}" ≈ "${best.merchant_text}" → ${best.category_name} (${(best.similarity * 100).toFixed(1)}%)`
        );
        return { category: best.category_name, method: "pattern" };
      }
    } catch (ragErr) {
      // RAG is best-effort; if embeddings aren't set up yet, skip silently
      console.log("RAG search skipped:", ragErr instanceof Error ? ragErr.message : ragErr);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Use Azure OpenAI to parse a bank email and classify it in one call.
 */
export async function parseWithAI(
  email: FetchedEmail,
  userId?: string
): Promise<AIParseResult | null> {
  try {
    const userMessage = `Asunto: ${email.subject}
De: ${email.from}
Fecha del correo: ${email.date}
Cuerpo:
${email.bodyText.slice(0, 2000)}`;

    const response = await chatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);

    const cleaned = response.trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error) return null;

    // Post-AI validation: fix obvious misclassifications
    const bodyLower = email.bodyText.slice(0, 500).toLowerCase();
    if (parsed.type === "income") {
      const expenseIndicators = ["compraste", "compra por", "pagaste", "pago en", "retiraste", "débito", "t.deb"];
      if (expenseIndicators.some((w) => bodyLower.includes(w))) {
        console.log(`AI correction: "${parsed.merchant}" classified as income but body says expense`);
        parsed.type = "expense";
      }
    }

    // Post-AI: extract card_last_four from body if AI missed it
    if (!parsed.cardLastFour) {
      const bodyText = email.bodyText.slice(0, 1000);
      const patterns = [
        /\*(\d{4})/,                           // *1036
        /cuenta\s*\*{2,}\s*(\d{4})/i,          // cuenta **3181
        /cuenta\s*Nro\.\*+\s*(\d{4})/i,        // cuenta Nro.******* 6635
        /tarjeta\s*[.*]+(\d{4})/i,             // tarjeta ...4532
        /T\.(?:Deb|Cred)\s*\*(\d{4})/i,        // T.Deb *1036
        /terminada\s*en\s*(\d{4})/i,           // terminada en 4532
      ];
      for (const p of patterns) {
        const match = bodyText.match(p);
        if (match) {
          parsed.cardLastFour = match[1];
          break;
        }
      }
    }

    if (
      !parsed.type ||
      !parsed.amount ||
      !parsed.merchant ||
      typeof parsed.amount !== "number"
    ) {
      return null;
    }

    let categoryName = parsed.categoryName || "Otros";
    let classificationMethod: "ai" | "pattern" = "ai";
    let excludeFromTotals = false;

    // Priority 1: User-specific rules (per-user RAG)
    if (userId) {
      const userRule = await matchUserRule(parsed.merchant, userId);
      if (userRule) {
        categoryName = userRule.category;
        classificationMethod = "pattern";
        // Determine exclusion based on transaction type and rule
        if (parsed.type === "expense" && !userRule.includeInExpenses) {
          excludeFromTotals = true;
        }
        if (parsed.type === "income" && !userRule.includeInIncome) {
          excludeFromTotals = true;
        }
      } else {
        // Priority 2: Global patterns
        const match = await matchPattern(parsed.merchant);
        if (match) {
          if (match.category !== categoryName) {
            console.log(
              `RAG override: AI said "${categoryName}" but RAG matched "${match.category}" for "${parsed.merchant}"`
            );
          }
          categoryName = match.category;
          classificationMethod = match.method;
        }
      }
    } else {
      // No userId: only check global patterns
      const match = await matchPattern(parsed.merchant);
      if (match) {
        categoryName = match.category;
        classificationMethod = match.method;
      }
    }

    return {
      type: parsed.type,
      amount: Math.round(parsed.amount),
      merchant: parsed.merchant,
      description: parsed.description || null,
      transactionDate: toColombiaDate(parsed.transactionDate, email.date),
      cardLastFour: parsed.cardLastFour || null,
      categoryName,
      classificationMethod,
      excludeFromTotals,
    };
  } catch (err) {
    console.error("AI parsing failed:", err);
    return null;
  }
}
