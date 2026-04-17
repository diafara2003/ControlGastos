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

export const nequiPattern: BankPattern = {
  senders: ["notificaciones@nequi.com"],
  bankName: "Nequi",

  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null {
    const text = bodyText.toLowerCase();

    // Envío de dinero: "Enviaste $50,000 a Juan"
    const envioMatch = bodyText.match(
      /enviaste\s+\$([\d.,]+)\s+a\s+([^.]+)/i
    );
    if (envioMatch) {
      const amount = parseAmount(`$${envioMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: envioMatch[2].trim(),
          description: "Envío Nequi",
          transactionDate: new Date(date),
        };
      }
    }

    // Pago en comercio: "Pagaste $30,000 en TIENDA"
    const pagoMatch = bodyText.match(
      /pagaste\s+\$([\d.,]+)\s+en\s+([^.]+)/i
    );
    if (pagoMatch) {
      const amount = parseAmount(`$${pagoMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: pagoMatch[2].trim(),
          description: "Pago en comercio",
          transactionDate: new Date(date),
        };
      }
    }

    // Retiro
    const retiroMatch = bodyText.match(
      /retir(?:aste|o)\s+\$([\d.,]+)/i
    );
    if (retiroMatch) {
      const amount = parseAmount(`$${retiroMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: "Retiro Nequi",
          description: "Retiro de efectivo",
          transactionDate: new Date(date),
        };
      }
    }

    // Recibido: "Recibiste $100,000 de Maria"
    const recibidoMatch = bodyText.match(
      /recibiste\s+\$([\d.,]+)(?:\s+de\s+([^.]+))?/i
    );
    if (recibidoMatch) {
      const amount = parseAmount(`$${recibidoMatch[1]}`);
      if (amount) {
        return {
          type: "income",
          amount,
          merchant: recibidoMatch[2]?.trim() ?? "Nequi",
          description: "Dinero recibido",
          transactionDate: new Date(date),
        };
      }
    }

    // Generic Nequi with amount
    const genericAmount = bodyText.match(/\$([\d.,]+)/);
    if (genericAmount) {
      const amount = parseAmount(`$${genericAmount[1]}`);
      if (amount && amount > 0) {
        const isIncome = text.includes("recib") || text.includes("deposit");
        return {
          type: isIncome ? "income" : "expense",
          amount,
          merchant: "Nequi",
          description: subject || "Notificación Nequi",
          transactionDate: new Date(date),
        };
      }
    }

    return null;
  },
};
