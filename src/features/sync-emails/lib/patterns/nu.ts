import type { BankPattern, ParsedTransaction } from "./types";

function parseAmount(text: string): number | null {
  const match = text.match(/\$\s*([\d.,]+)/);
  if (!match) return null;
  let raw = match[1];
  if (raw.includes(",") && raw.indexOf(",") > raw.lastIndexOf(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (!raw.includes(",") && /^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, "");
  } else {
    raw = raw.replace(/,/g, "");
  }
  const num = parseFloat(raw);
  return isNaN(num) ? null : Math.round(num);
}

export const nuPattern: BankPattern = {
  senders: ["nu@nu.com.co", "noreply@soynu.com.co", "nu.com.co"],
  bankName: "Nu",

  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null {
    const text = bodyText.toLowerCase();

    // Pago de tarjeta recibido: "Recibimos el pago que hiciste de tu Tarjeta de crédito"
    const pagoMatch = bodyText.match(
      /(?:recibimos\s+(?:el\s+)?(?:tu\s+)?pago|tu\s+pago\s+de|pago\s+de\s+\$|hiciste[^$]*)[^$]*\$([\d.,]+)/i
    );
    if (pagoMatch) {
      const amount = parseAmount(`$${pagoMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: "Nu",
          description: "Pago tarjeta Nu",
          transactionDate: new Date(date),
          cardLastFour: null,
          categoryName: "Pago tarjeta crédito",
          excludeFromTotals: true,
        };
      }
    }

    // Compra con tarjeta Nu
    const compraMatch = bodyText.match(
      /(?:compraste|compra\s+de)\s+\$([\d.,]+)\s+(?:en\s+)([^.\n,]+)/i
    );
    if (compraMatch) {
      const amount = parseAmount(`$${compraMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: compraMatch[2].trim(),
          description: "Compra con tarjeta Nu",
          transactionDate: new Date(date),
          cardLastFour: null,
        };
      }
    }

    // Fallback: cualquier monto en email de Nu con contexto de pago/compra
    if (text.includes("pago") || text.includes("compra") || text.includes("transacción")) {
      const genericAmount = bodyText.match(/\$([\d.,]+)/);
      if (genericAmount) {
        const amount = parseAmount(`$${genericAmount[1]}`);
        if (amount && amount > 0) {
          const isIncome = text.includes("recibiste") || text.includes("depósito") || text.includes("abono");
          return {
            type: isIncome ? "income" : "expense",
            amount,
            merchant: "Nu",
            description: subject || "Notificación Nu",
            transactionDate: new Date(date),
            cardLastFour: null,
          };
        }
      }
    }

    return null;
  },
};
