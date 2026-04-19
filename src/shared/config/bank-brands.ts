/**
 * Colombian bank brand mapping.
 * Maps email domains and bank names to brand colors and short names.
 */

export interface BankBrand {
  name: string;
  shortName: string;
  color: string;        // primary brand color
  bgColor: string;      // light background
  textColor: string;    // text on light bg
  initials: string;     // 2-letter initials for avatar
}

const BANK_BRANDS: Record<string, BankBrand> = {
  bancolombia: {
    name: "Bancolombia",
    shortName: "Bancolombia",
    color: "#FDDA24",
    bgColor: "#FFFBEB",
    textColor: "#92400E",
    initials: "BC",
  },
  notificacionesbancolombia: {
    name: "Bancolombia",
    shortName: "Bancolombia",
    color: "#FDDA24",
    bgColor: "#FFFBEB",
    textColor: "#92400E",
    initials: "BC",
  },
  nequi: {
    name: "Nequi",
    shortName: "Nequi",
    color: "#2D0047",
    bgColor: "#F3E8FF",
    textColor: "#6B21A8",
    initials: "NQ",
  },
  davivienda: {
    name: "Davivienda",
    shortName: "Davivienda",
    color: "#E30613",
    bgColor: "#FEF2F2",
    textColor: "#DC2626",
    initials: "DV",
  },
  bancocajasocial: {
    name: "Banco Caja Social",
    shortName: "Caja Social",
    color: "#003DA5",
    bgColor: "#EFF6FF",
    textColor: "#1D4ED8",
    initials: "CS",
  },
  bbva: {
    name: "BBVA",
    shortName: "BBVA",
    color: "#004481",
    bgColor: "#EFF6FF",
    textColor: "#1E40AF",
    initials: "BB",
  },
  scotiabank: {
    name: "Scotiabank Colpatria",
    shortName: "Scotiabank",
    color: "#EC111A",
    bgColor: "#FEF2F2",
    textColor: "#DC2626",
    initials: "SB",
  },
  colpatria: {
    name: "Scotiabank Colpatria",
    shortName: "Colpatria",
    color: "#EC111A",
    bgColor: "#FEF2F2",
    textColor: "#DC2626",
    initials: "CP",
  },
  bancodebogota: {
    name: "Banco de Bogotá",
    shortName: "B. Bogotá",
    color: "#003B71",
    bgColor: "#EFF6FF",
    textColor: "#1E40AF",
    initials: "BB",
  },
  bancodeoccidente: {
    name: "Banco de Occidente",
    shortName: "B. Occidente",
    color: "#00529B",
    bgColor: "#EFF6FF",
    textColor: "#1D4ED8",
    initials: "BO",
  },
  bancopopular: {
    name: "Banco Popular",
    shortName: "B. Popular",
    color: "#003DA5",
    bgColor: "#EFF6FF",
    textColor: "#1D4ED8",
    initials: "BP",
  },
  avvillas: {
    name: "AV Villas",
    shortName: "AV Villas",
    color: "#E4002B",
    bgColor: "#FEF2F2",
    textColor: "#DC2626",
    initials: "AV",
  },
  bancofalabella: {
    name: "Banco Falabella",
    shortName: "Falabella",
    color: "#B5CC18",
    bgColor: "#F7FEE7",
    textColor: "#4D7C0F",
    initials: "BF",
  },
  nu: {
    name: "Nu Colombia",
    shortName: "Nu",
    color: "#820AD1",
    bgColor: "#FAF5FF",
    textColor: "#7C3AED",
    initials: "NU",
  },
  soynu: {
    name: "Nu Colombia",
    shortName: "Nu",
    color: "#820AD1",
    bgColor: "#FAF5FF",
    textColor: "#7C3AED",
    initials: "NU",
  },
  daviplata: {
    name: "DaviPlata",
    shortName: "DaviPlata",
    color: "#E30613",
    bgColor: "#FEF2F2",
    textColor: "#DC2626",
    initials: "DP",
  },
  rappipay: {
    name: "RappiPay",
    shortName: "RappiPay",
    color: "#FF441F",
    bgColor: "#FFF7ED",
    textColor: "#EA580C",
    initials: "RP",
  },
  addi: {
    name: "Addi",
    shortName: "Addi",
    color: "#00C389",
    bgColor: "#ECFDF5",
    textColor: "#059669",
    initials: "AD",
  },
  lulo: {
    name: "Lulo Bank",
    shortName: "Lulo",
    color: "#FF6B00",
    bgColor: "#FFF7ED",
    textColor: "#EA580C",
    initials: "LB",
  },
  itau: {
    name: "Itaú",
    shortName: "Itaú",
    color: "#003DA5",
    bgColor: "#EFF6FF",
    textColor: "#1D4ED8",
    initials: "IT",
  },
  movii: {
    name: "MOVii",
    shortName: "MOVii",
    color: "#00B4D8",
    bgColor: "#ECFEFF",
    textColor: "#0891B2",
    initials: "MV",
  },
};

// Default for unknown banks
const DEFAULT_BRAND: BankBrand = {
  name: "Banco",
  shortName: "Banco",
  color: "#6B7280",
  bgColor: "#F9FAFB",
  textColor: "#374151",
  initials: "??",
};

/**
 * Get bank brand info from an email domain or bank name.
 * Matches by checking if the input contains a known bank key.
 */
export function getBankBrand(domainOrName: string): BankBrand {
  const normalized = domainOrName.toLowerCase().replace(/[^a-z]/g, "");

  // Direct match
  if (BANK_BRANDS[normalized]) return BANK_BRANDS[normalized];

  // Partial match
  for (const [key, brand] of Object.entries(BANK_BRANDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return brand;
    }
  }

  return DEFAULT_BRAND;
}
