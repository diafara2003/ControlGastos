import type { BankPattern, ParsedTransaction } from "./types";

function parseAmount(text: string): number | null {
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
  return isNaN(num) ? null : Math.round(num);
}

// Types that indicate income
const INCOME_TYPES = [
  "abono nomina",
  "abono proveedores",
  "deposito",
  "consignacion",
  "transferencia recibida",
];

function isIncomeType(txType: string): boolean {
  const lower = txType.toLowerCase();
  return INCOME_TYPES.some((t) => lower.includes(t));
}

export const cajaSocialPattern: BankPattern = {
  senders: [
    "alertas@bancocajasocial.com",
    "notificador@bancocajasocial.com",
    "notificaciones@bancocajasocial.com",
    "bancocajasocial.com",
  ],
  bankName: "Banco Caja Social",

  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null {
    // Format: "Banco Caja Social le informa que el dia YYYY.MM.DD a las HH:MM
    //          se realizo una transaccion de TIPO EXITOSA por un valor de $MONTO en MERCHANT"
    const match = bodyText.match(
      /el\s+dia\s+(\d{4})\.(\d{2})\.(\d{2})\s+a\s+las\s+(\d{2}):(\d{2})\s+se\s+realizo\s+una\s+transaccion\s+de\s+(.+?)\s+EXITOSA\s+por\s+un\s+valor\s+de\s+\$([\d.,]+)(?:\s+en\s+(.+?))?(?:\s+desde|\s+cuenta|\.|$)/i
    );

    if (!match) {
      // Fallback: simpler pattern
      const simple = bodyText.match(
        /el\s+dia\s+(\d{4})\.(\d{2})\.(\d{2})\s+a\s+las\s+(\d{2}):(\d{2})\s+se\s+realizo\s+una\s+transaccion\s+de\s+(.+?)\s+EXITOSA\s+por\s+un\s+valor\s+de\s+\$([\d.,]+)/i
      );
      if (!simple) return null;

      const [, yyyy, mm, dd, hh, min, txType, amountStr] = simple;
      const amount = parseAmount(`$${amountStr}`);
      if (!amount) return null;

      const type = isIncomeType(txType) ? "income" : "expense";
      const merchant = txType.trim();

      return {
        type,
        amount,
        merchant,
        description: txType.trim(),
        transactionDate: new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00-05:00`),
        cardLastFour: null,
      };
    }

    const [, yyyy, mm, dd, hh, min, txType, amountStr, merchantRaw] = match;
    const amount = parseAmount(`$${amountStr}`);
    if (!amount) return null;

    const type = isIncomeType(txType) ? "income" : "expense";
    const merchant = merchantRaw?.trim() || txType.trim();

    // Extract card last four from account number: "cuenta Nro.******* 6635"
    const cardMatch = bodyText.match(/cuenta\s+Nro\.\*+\s*(\d{4})/i);
    const cardLastFour = cardMatch?.[1] ?? null;

    return {
      type,
      amount,
      merchant,
      description: txType.trim(),
      transactionDate: new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00-05:00`),
      cardLastFour,
    };
  },
};
