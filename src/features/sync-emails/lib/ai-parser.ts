import { chatCompletion } from "@/src/shared/api/azure-openai";
import type { FetchedEmail } from "./gmail";
import type { ParsedTransaction } from "./patterns";

const SYSTEM_PROMPT = `Eres un parser de notificaciones bancarias colombianas.
Dado un email bancario, extrae la información de la transacción en formato JSON.

Responde SOLO con un objeto JSON válido (sin markdown, sin explicación):
{
  "type": "expense" | "income",
  "amount": <número entero en COP>,
  "merchant": "<nombre del comercio o destinatario>",
  "description": "<descripción corta>",
  "transactionDate": "<fecha ISO 8601>"
}

Si NO puedes identificar una transacción financiera, responde: {"error": "no_transaction"}

Reglas:
- amount siempre es positivo (entero, sin decimales)
- Si ves "nómina", "salario", "abono", "consignación", "transferencia recibida" → type = "income"
- Si ves "compra", "pago", "retiro", "débito", "transferencia enviada" → type = "expense"
- merchant debe ser el nombre del comercio, persona o entidad (no el banco)
- Si no hay comercio claro, usa el nombre del banco o "Desconocido"`;

/**
 * Use Azure OpenAI to parse an email that bank patterns couldn't handle.
 */
export async function parseWithAI(
  email: FetchedEmail
): Promise<ParsedTransaction | null> {
  try {
    const userMessage = `Asunto: ${email.subject}
De: ${email.from}
Fecha: ${email.date}
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
    };
  } catch (err) {
    console.error("AI parsing failed:", err);
    return null;
  }
}
