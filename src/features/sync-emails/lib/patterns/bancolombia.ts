import type { BankPattern, ParsedTransaction } from "./types";

function parseAmount(text: string): number | null {
  // Bancolombia formats: $150,000.00 or $150.000,00 or $150000
  const match = text.match(/\$\s*([\d.,]+)/);
  if (!match) return null;

  let raw = match[1];
  // Handle Colombian format: 1.234.567,89 → remove dots, replace comma with nothing
  // Or US format: 1,234,567.89
  if (raw.includes(",") && raw.indexOf(",") > raw.lastIndexOf(".")) {
    // Format: 150.000,00 (European/Colombian)
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // Format: 150,000.00 (US)
    raw = raw.replace(/,/g, "");
  }

  const num = parseFloat(raw);
  if (isNaN(num)) return null;
  return Math.round(num);
}

function parseDateFromBody(text: string, fallbackDate: string): Date {
  // Bancolombia date formats: "08/04/2026" or "08/Abr/2026" or "2026-04-08"
  const datePatterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        return new Date(`${match[1]}-${match[2]}-${match[3]}`);
      }
      return new Date(`${match[3]}-${match[2]}-${match[1]}`);
    }
  }

  return new Date(fallbackDate);
}

export const bancolombiaPattern: BankPattern = {
  senders: ["alertasynotificaciones@bancolombia.com.co"],
  bankName: "Bancolombia",

  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null {
    const text = bodyText.toLowerCase();

    // --- EXPENSES ---

    // Compra con tarjeta: "Bancolombia le informa compra por $150,000 en ALMACEN EXITO"
    const compraMatch = bodyText.match(
      /compra\s+(?:con\s+t[^$]*)?por\s+\$([\d.,]+)\s+en\s+([^.]+)/i
    );
    if (compraMatch) {
      const amount = parseAmount(`$${compraMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: compraMatch[2].trim(),
          description: "Compra con tarjeta",
          transactionDate: parseDateFromBody(bodyText, date),
        };
      }
    }

    // Pago PSE: "pago por $X desde...a EMPRESA"
    const pseMatch = bodyText.match(
      /pago\s+(?:PSE\s+)?por\s+\$([\d.,]+)\s+(?:desde[^a]+)?(?:a|en)\s+([^.]+)/i
    );
    if (pseMatch) {
      const amount = parseAmount(`$${pseMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: pseMatch[2].trim(),
          description: "Pago PSE",
          transactionDate: parseDateFromBody(bodyText, date),
        };
      }
    }

    // Retiro cajero: "retiro por $X en cajero"
    const retiroMatch = bodyText.match(
      /retiro\s+(?:en\s+cajero\s+)?por\s+\$([\d.,]+)/i
    );
    if (retiroMatch) {
      const amount = parseAmount(`$${retiroMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: "Cajero automático",
          description: "Retiro en cajero",
          transactionDate: parseDateFromBody(bodyText, date),
        };
      }
    }

    // Transferencia enviada: "transferencia por $X a NOMBRE"
    const transEnviadaMatch = bodyText.match(
      /transferencia\s+(?:enviada\s+)?por\s+\$([\d.,]+)\s+a\s+([^.]+)/i
    );
    if (transEnviadaMatch) {
      const amount = parseAmount(`$${transEnviadaMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: transEnviadaMatch[2].trim(),
          description: "Transferencia enviada",
          transactionDate: parseDateFromBody(bodyText, date),
        };
      }
    }

    // Débito automático
    const debitoMatch = bodyText.match(
      /d[eé]bito\s+autom[aá]tico\s+por\s+\$([\d.,]+)\s+(?:de|en|a)\s+([^.]+)/i
    );
    if (debitoMatch) {
      const amount = parseAmount(`$${debitoMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: debitoMatch[2].trim(),
          description: "Débito automático",
          transactionDate: parseDateFromBody(bodyText, date),
        };
      }
    }

    // --- INCOME ---

    // Transferencia recibida: "recibiste transferencia por $X de NOMBRE"
    const transRecibidaMatch = bodyText.match(
      /(?:recibi(?:ste|ó)|abono|consignaci[oó]n)\s+(?:de\s+)?(?:transferencia\s+)?por\s+\$([\d.,]+)(?:\s+de\s+([^.]+))?/i
    );
    if (transRecibidaMatch) {
      const amount = parseAmount(`$${transRecibidaMatch[1]}`);
      if (amount) {
        return {
          type: "income",
          amount,
          merchant: transRecibidaMatch[2]?.trim() ?? "Transferencia recibida",
          description: "Transferencia recibida",
          transactionDate: parseDateFromBody(bodyText, date),
        };
      }
    }

    // Nómina / abono de salario
    if (
      text.includes("nómina") ||
      text.includes("nomina") ||
      text.includes("salario") ||
      text.includes("abono de sueldo")
    ) {
      const nominaAmount = bodyText.match(/\$([\d.,]+)/);
      if (nominaAmount) {
        const amount = parseAmount(`$${nominaAmount[1]}`);
        if (amount) {
          return {
            type: "income",
            amount,
            merchant: "Nómina",
            description: "Abono de nómina",
            transactionDate: parseDateFromBody(bodyText, date),
          };
        }
      }
    }

    // Generic expense fallback: any amount mention with Bancolombia
    const genericMatch = bodyText.match(/\$([\d.,]+)/);
    if (genericMatch) {
      const amount = parseAmount(`$${genericMatch[1]}`);
      if (amount && amount > 0) {
        // Determine type from keywords
        const isIncome =
          text.includes("recib") ||
          text.includes("abono") ||
          text.includes("consignac");

        return {
          type: isIncome ? "income" : "expense",
          amount,
          merchant: "Bancolombia",
          description: subject || "Notificación Bancolombia",
          transactionDate: parseDateFromBody(bodyText, date),
        };
      }
    }

    return null;
  },
};
