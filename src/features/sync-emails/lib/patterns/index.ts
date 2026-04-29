import { bancolombiaPattern } from "./bancolombia";
import { nequiPattern } from "./nequi";
import { daviviendaPattern } from "./davivienda";
import { nuPattern } from "./nu";
import { cajaSocialPattern } from "./cajasocial";
import { genericPattern } from "./generic";
import type { BankPattern, ParsedTransaction } from "./types";

export type { ParsedTransaction, BankPattern };

const ALL_PATTERNS: BankPattern[] = [
  bancolombiaPattern,
  nequiPattern,
  daviviendaPattern,
  nuPattern,
  cajaSocialPattern,
  genericPattern,
];

/**
 * Find the right parser for a given sender email.
 * Returns null if no specific pattern matches (use generic or AI fallback).
 */
export function findPattern(senderEmail: string): BankPattern | null {
  const sender = senderEmail.toLowerCase();
  return (
    ALL_PATTERNS.find((p) =>
      p.senders.some((s) => sender.includes(s))
    ) ?? null
  );
}

/**
 * Get the generic pattern (used as level 2 fallback).
 */
export function getGenericPattern(): BankPattern {
  return genericPattern;
}
