import { chatCompletion } from "@/src/shared/api/azure-openai";
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
- Efectivo (retiros de cajero)
- Transferencias (transferencias enviadas a personas)
- Ingresos (nómina, salario, consignaciones, transferencias recibidas)
- Otros (si no encaja en ninguna)

Reglas:
- amount siempre es positivo (entero, sin decimales)
- "compraste", "compra", "pago en", "pagaste" → type = "expense"
- "transferiste", "enviaste" → type = "expense", categoría = "Transferencias"
- "te enviaron", "recibiste", "abono", "consignación", "nómina" → type = "income"
- "retiraste", "retiro" → type = "expense", categoría = "Efectivo"
- merchant debe ser el comercio, persona o entidad (NO el banco emisor)
- Si el merchant es un código raro (ej: KS*PAGSEGURO), intenta deducir el comercio real
- transactionDate debe extraerse del cuerpo del correo, no del header
- Extractos de tarjeta de crédito o servicios (Addi, Nu, etc.) con "total a pagar", "saldo a pagar" o "valor de tu cuota" → type = "expense", merchant = nombre del servicio (ej: "Addi", "Nu"), categoría = "Otros", amount = el total/cuota a pagar`;

export interface AIParseResult extends ParsedTransaction {
  categoryName: string;
}

/**
 * Use Azure OpenAI to parse a bank email and classify it in one call.
 */
export async function parseWithAI(
  email: FetchedEmail
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

    if (
      !parsed.type ||
      !parsed.amount ||
      !parsed.merchant ||
      typeof parsed.amount !== "number"
    ) {
      return null;
    }

    return {
      type: parsed.type,
      amount: Math.round(parsed.amount),
      merchant: parsed.merchant,
      description: parsed.description || null,
      transactionDate: parsed.transactionDate
        ? new Date(parsed.transactionDate)
        : new Date(email.date),
      cardLastFour: parsed.cardLastFour || null,
      categoryName: parsed.categoryName || "Otros",
    };
  } catch (err) {
    console.error("AI parsing failed:", err);
    return null;
  }
}
