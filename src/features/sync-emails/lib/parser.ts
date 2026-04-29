import type { FetchedEmail } from "./gmail";
import type { ParsedTransaction } from "./patterns";
import { findPattern } from "./patterns";
import { parseWithAI } from "./ai-parser";

export interface ParseResult {
  email: FetchedEmail;
  parsed: (ParsedTransaction & { excludeFromTotals?: boolean }) | null;
  categoryName: string | null;
  method: "ai" | "pattern" | "failed";
}

/**
 * Parse emails using AI. Processes them in parallel with concurrency limit.
 */
export async function parseEmails(
  emails: FetchedEmail[],
  userId?: string
): Promise<ParseResult[]> {
  const CONCURRENCY = 5;
  const results: ParseResult[] = [];

  for (let i = 0; i < emails.length; i += CONCURRENCY) {
    const batch = emails.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (email) => {
        try {
          // 1. Try pattern-based parsing first (fast, no AI needed)
          const pattern = findPattern(email.from);
          if (pattern) {
            const patternResult = pattern.parse(email.bodyText, email.subject, email.date);
            if (patternResult) {
              return {
                email,
                parsed: patternResult,
                categoryName: patternResult.categoryName ?? null,
                method: "pattern",
              } as ParseResult;
            }
          }

          // 2. Fall back to AI
          const parsed = await parseWithAI(email, userId);
          if (parsed) {
            const { categoryName, classificationMethod, excludeFromTotals, ...transaction } = parsed;
            return {
              email,
              parsed: { ...transaction, excludeFromTotals },
              categoryName,
              method: classificationMethod ?? "ai",
            } as ParseResult;
          }
          return { email, parsed: null, categoryName: null, method: "failed" } as ParseResult;
        } catch {
          return { email, parsed: null, categoryName: null, method: "failed" } as ParseResult;
        }
      })
    );
    results.push(...batchResults);
  }

  return results;
}
