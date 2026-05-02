import type { BankPattern, ParsedTransaction } from "./types";
import { extractCardLastFour } from "./types";

function parseAmount(text: string): number | null {
  // Bancolombia formats: $150,000.00 or $150.000,00 or $150.000 or $150000
  const match = text.match(/\$\s*([\d.,]+)/);
  if (!match) return null;

  let raw = match[1];
  if (raw.includes(",") && raw.indexOf(",") > raw.lastIndexOf(".")) {
    // Format: 150.000,00 (Colombian/European) — dots are thousands, comma is decimal
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (!raw.includes(",") && /^\d{1,3}(\.\d{3})+$/.test(raw)) {
    // Format: 300.000 or 1.500.000 (Colombian thousands with no decimal part)
    raw = raw.replace(/\./g, "");
  } else {
    // Format: 150,000.00 (US) or plain number
    raw = raw.replace(/,/g, "");
  }

  const num = parseFloat(raw);
  if (isNaN(num)) return null;
  return Math.round(num);
}

function parseDateFromBody(text: string, fallbackDate: string): Date {
  // Try to extract full datetime: "28/04/2026 13:45:15" — treat as Colombia time (UTC-5)
  const datetimeMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (datetimeMatch) {
    const [, dd, mm, yyyy, hh, min, ss = "00"] = datetimeMatch;
    return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-05:00`);
  }

  // Date only: "28/04/2026" — use noon Colombia time to avoid UTC day-shift
  const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    return new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T12:00:00-05:00`);
  }

  // ISO format: "2026-04-28"
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00-05:00`);
  }

  return new Date(fallbackDate);
}

export const bancolombiaPattern: BankPattern = {
  senders: [
    "alertasynotificaciones@bancolombia.com.co",
    "alertasynotificaciones@an.notificacionesbancolombia.com",
    "notificacionesbancolombia.com",
  ],
  bankName: "Bancolombia",

  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null {
    const text = bodyText.toLowerCase();
    const cardLastFour = extractCardLastFour(bodyText);

    // --- EXPENSES ---

    // "Compraste $36.084,00 en KS*PAGSEGURO CO con tu T.Deb *1036"
    const comprasteMatch = bodyText.match(
      /[Cc]ompraste\s+\$([\d.,]+)\s+en\s+([^,]+?)(?:\s+con\s+tu|\s+el\s+\d|,|$)/i
    );
    if (comprasteMatch) {
      const amount = parseAmount(`$${comprasteMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: comprasteMatch[2].trim(),
          description: "Compra con tarjeta",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
        };
      }
    }

    // "Pagaste $X en COMERCIO" / "Pagaste $X a NOMBRE"
    const pagasteMatch = bodyText.match(
      /[Pp]agaste\s+\$([\d.,]+)\s+(?:en|a)\s+(.+?)(?:\s+desde\s+tu|\s+con\s+tu|\s+el\s+\d|,|$)/i
    );
    if (pagasteMatch) {
      const amount = parseAmount(`$${pagasteMatch[1]}`);
      if (amount) {
        const merchant = pagasteMatch[2].trim();
        const CREDIT_CARD_MERCHANTS = ["nu compania de financiamiento", "nu colombia", "bancolombia tarjeta", "tarjeta de credito"];
        const isCreditCardPayment = CREDIT_CARD_MERCHANTS.some((m) => merchant.toLowerCase().includes(m));
        return {
          type: "expense",
          amount,
          merchant,
          description: isCreditCardPayment ? "Pago tarjeta crédito" : "Pago",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
          ...(isCreditCardPayment && { categoryName: "Pago tarjeta crédito", excludeFromTotals: true }),
        };
      }
    }

    // "Retiraste $X en CAJERO"
    const retirasteMatch = bodyText.match(
      /[Rr]etiraste\s+\$([\d.,]+)(?:\s+(?:en|de)\s+([^,]+?))?(?:\s+con\s+tu|,|\.|$)/i
    );
    if (retirasteMatch) {
      const amount = parseAmount(`$${retirasteMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: retirasteMatch[2]?.trim() ?? "Cajero automático",
          description: "Retiro",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
        };
      }
    }

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
          cardLastFour,
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
          cardLastFour,
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
          cardLastFour,
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
          cardLastFour,
        };
      }
    }

    // "transferiste $800,000 a la llave XXXX desde tu cuenta *3181 a NOMBRE el DD/MM"
    // "transferiste $800,000 a la llave XXXX desde tu cuenta *3181 a NOMBRE el DD/MM"
    const transferisteLlaveMatch = bodyText.match(
      /transferiste\s+\$([\d.,]+)\s+a\s+la\s+llave\s+\S+\s+desde\s+tu\s+cuenta\s+\S+\s+a\s+(.+?)\s+el\s+/i
    );
    if (transferisteLlaveMatch) {
      const amount = parseAmount(`$${transferisteLlaveMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: transferisteLlaveMatch[2].trim(),
          description: "Transferencia enviada",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
        };
      }
    }

    // "Transferiste $65,000 desde tu cuenta 3181 a la cuenta *3204758089 el DD/MM"
    const transferisteCuentaMatch = bodyText.match(
      /[Tt]ransferiste\s+\$([\d.,]+)\s+desde\s+tu\s+cuenta\s+\S+\s+a\s+la\s+cuenta\s+\S+/i
    );
    if (transferisteCuentaMatch) {
      const amount = parseAmount(`$${transferisteCuentaMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: "Transferencia entre cuentas",
          description: "Transferencia entre cuentas propias",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
        };
      }
    }

    // "transferiste $75,000.00 a la llave ... a NOMBRE el DD/MM/YY" (fallback)
    const transferisteMatch = bodyText.match(
      /transferiste\s+\$([\d.,]+)\s+.*?a\s+([A-Za-záéíóúÁÉÍÓÚñÑ][^\n,*]+?)\s+el\s+\d/i
    );
    if (transferisteMatch) {
      const amount = parseAmount(`$${transferisteMatch[1]}`);
      if (amount) {
        return {
          type: "expense",
          amount,
          merchant: transferisteMatch[2].trim(),
          description: "Transferencia enviada",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
        };
      }
    }

    // "te enviaron $X desde ... de NOMBRE"
    const teEnviaronMatch = bodyText.match(
      /te\s+enviaron\s+\$([\d.,]+).*?(?:de|desde)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)(?:\s+el\s+|[.,]|$)/i
    );
    if (teEnviaronMatch) {
      const amount = parseAmount(`$${teEnviaronMatch[1]}`);
      if (amount) {
        return {
          type: "income",
          amount,
          merchant: teEnviaronMatch[2].trim(),
          description: "Transferencia recibida",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
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
          cardLastFour,
        };
      }
    }

    // --- INCOME ---

    // "recibiste una transferencia de NOMBRE por $X en tu cuenta"
    const transRecibidaDeMatch = bodyText.match(
      /recibiste\s+una\s+transferencia\s+de\s+(.+?)\s+por\s+\$([\d.,]+)/i
    );
    if (transRecibidaDeMatch) {
      const amount = parseAmount(`$${transRecibidaDeMatch[2]}`);
      if (amount) {
        return {
          type: "income",
          amount,
          merchant: transRecibidaDeMatch[1].trim(),
          description: "Transferencia recibida",
          transactionDate: parseDateFromBody(bodyText, date),
          cardLastFour,
        };
      }
    }

    // "recibiste una transferencia por $X de NOMBRE" (formato alternativo)
    const transRecibidaMatch = bodyText.match(
      /(?:recibi(?:ste|ó)|abono|consignaci[oó]n)\s+(?:de\s+)?(?:una\s+)?(?:transferencia\s+)?por\s+\$([\d.,]+)(?:\s+de\s+([^,.\n]+?))?(?:\s+en\s+tu|\s+a\s+tu|,|\.|$)/i
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
          cardLastFour,
        };
      }
    }

    // Nómina / abono de salario
    // "Recibiste un pago de Nomina de SINCOSOFT SAS por $13,930,202.00"
    if (
      text.includes("nómina") ||
      text.includes("nomina") ||
      text.includes("salario") ||
      text.includes("abono de sueldo")
    ) {
      const nominaEmpresaMatch = bodyText.match(
        /pago\s+de\s+[Nn][oó]mina\s+de\s+(.+?)\s+por\s+\$([\d.,]+)/i
      );
      if (nominaEmpresaMatch) {
        const amount = parseAmount(`$${nominaEmpresaMatch[2]}`);
        if (amount) {
          return {
            type: "income",
            amount,
            merchant: nominaEmpresaMatch[1].trim(),
            description: "Pago de nómina",
            transactionDate: parseDateFromBody(bodyText, date),
            cardLastFour,
          };
        }
      }
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
            cardLastFour,
          };
        }
      }
    }

    return null;
  },
};
