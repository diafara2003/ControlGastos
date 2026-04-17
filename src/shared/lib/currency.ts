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
