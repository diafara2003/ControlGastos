const formatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCOP(amount: number): string {
  return formatter.format(amount);
}

export function parseCOPAmount(text: string): number | null {
  const cleaned = text.replace(/[$.,:;\s]/g, "").replace(/,/g, "");
  const match = cleaned.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/** Format a raw numeric string with thousand separators as the user types */
export function formatCOPInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("es-CO");
}

/** Strip formatting to get raw digits */
export function rawDigits(formatted: string): string {
  return formatted.replace(/\D/g, "");
}
