import type { BankPattern, ParsedTransaction } from "./types";
import { extractCardLastFour } from "./types";

function parseAmount(text: string): number | null {
  const match = text.match(/\$\s*([\d.,]+)/);
  if (!match) return null;
  let raw = match[1];
  if (raw.includes(",") && raw.indexOf(",") > raw.lastIndexOf(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    raw = raw.replace(/,/g, "");
  }
  const num = parseFloat(raw);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Generic pattern for any Colombian bank notification.
 * Tries broad regex patterns common across banks.
 */
export const genericPattern: BankPattern = {
  senders: [
    "alertas@bancocajasocial.com",
    "notificaciones@avvillas.com.co",
  ],
  bankName: "Genérico",

  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null {
    const text = bodyText.toLowerCase();
    const cardLastFour = extractCardLastFour(bodyText);

    // Income keywords
    const incomeKeywords = [
      "recibiste", "recibió", "abono", "consignación", "consignacion",
      "nómina", "nomina", "salario", "transferencia recibida",
    ];
    const isIncome = incomeKeywords.some((kw) => text.includes(kw));

    // Expense keywords
    const expenseKeywords = [
      "compra", "pago", "retiro", "débito", "debito", "transferencia",
      "enviaste", "envió",
    ];
    const isExpense = expenseKeywords.some((kw) => text.includes(kw));

    // Try to find amount
    const amountMatch = bodyText.match(/\$([\d.,]+)/);
    if (!amountMatch) return null;

    const amount = parseAmount(`$${amountMatch[1]}`);
    if (!amount || amount <= 0) return null;

    // Try to find merchant/destination
    let merchant = "Desconocido";

    // "en COMERCIO" pattern
    const enMatch = bodyText.match(/(?:en|a)\s+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s&]{2,30})/);
    if (enMatch) {
      merchant = enMatch[1].trim();
    }

    // Determine type
    let type: "expense" | "income" = "expense";
    if (isIncome && !isExpense) {
      type = "income";
    } else if (isIncome && isExpense) {
      // If both keywords found, check position — closest to amount wins
      // Default to expense
      type = "expense";
    }

    return {
      type,
      amount,
      merchant,
      description: subject || "Notificación bancaria",
      transactionDate: new Date(date),
      cardLastFour,
    };
  },
};
