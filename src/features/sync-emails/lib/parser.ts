import type { FetchedEmail } from "./gmail";
import { findPattern, getGenericPattern } from "./patterns";
import type { ParsedTransaction } from "./patterns";

export interface ParseResult {
  email: FetchedEmail;
  parsed: ParsedTransaction | null;
  method: "bank_pattern" | "generic_pattern" | "ai" | "failed";
}

/**
 * Parse a fetched email through the pipeline:
 * 1. Bank-specific pattern (by sender)
 * 2. Generic pattern (broad regex)
 * 3. Returns null (caller should try AI fallback)
 */
export function parseEmail(email: FetchedEmail): ParseResult {
  // Level 1: Bank-specific pattern
  const bankPattern = findPattern(email.from);
  if (bankPattern) {
    const parsed = bankPattern.parse(email.bodyText, email.subject, email.date);
    if (parsed) {
      return { email, parsed, method: "bank_pattern" };
    }
  }

  // Level 2: Generic Colombian bank patterns
  const generic = getGenericPattern();
  const genericResult = generic.parse(email.bodyText, email.subject, email.date);
  if (genericResult) {
    return { email, parsed: genericResult, method: "generic_pattern" };
  }

  // Level 3: Caller should use AI fallback
  return { email, parsed: null, method: "failed" };
}

/**
 * Parse multiple emails, returning results with parse method info.
 */
export function parseEmails(emails: FetchedEmail[]): ParseResult[] {
  return emails.map(parseEmail);
}
