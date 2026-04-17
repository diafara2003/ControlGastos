import type { BankPattern, ParsedTransaction } from "./types";

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

export const daviviendaPattern: BankPattern = {
  senders: ["alertas@davivienda.com"],
  bankName: "Davivienda",

  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null {
    const text = bodyText.toLowerCase();

    // Compra: "compra por $X en COMERCIO"
    const compraMatch = bodyText.match(
      /compra\s+por\s+\$([\d.,]+)\s+en\s+([^.]+)/i
    );
    if (compraMatch) {
      const amount = parseAmount(`$${compraMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: compraMatch[2].trim(),
          description: "Compra con tarjeta",
          transactionDate: new Date(date),
        };
      }
    }

    // Pago
    const pagoMatch = bodyText.match(
      /pago\s+por\s+\$([\d.,]+)\s+(?:a|en)\s+([^.]+)/i
    );
    if (pagoMatch) {
      const amount = parseAmount(`$${pagoMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: pagoMatch[2].trim(),
          description: "Pago",
          transactionDate: new Date(date),
        };
      }
    }

    // Transferencia recibida
    const ingresoMatch = bodyText.match(
      /(?:recibi|abono|consignaci)\w*\s+(?:por\s+)?\$([\d.,]+)/i
    );
    if (ingresoMatch) {
      const amount = parseAmount(`$${ingresoMatch[1]}`);
      if (amount) {
        return {
          type: "income",
          amount,
          merchant: "Davivienda",
          description: "Abono recibido",
          transactionDate: new Date(date),
        };
      }
    }

    // Generic fallback
    const genericAmount = bodyText.match(/\$([\d.,]+)/);
    if (genericAmount) {
      const amount = parseAmount(`$${genericAmount[1]}`);
      if (amount && amount > 0) {
        const isIncome = text.includes("recib") || text.includes("abono") || text.includes("consignac");
        return {
          type: isIncome ? "income" : "expense",
          amount,
          merchant: "Davivienda",
          description: subject || "Notificación Davivienda",
          transactionDate: new Date(date),
        };
      }
    }

    return null;
  },
};
