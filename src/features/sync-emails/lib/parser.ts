import type { FetchedEmail } from "./gmail";
import type { ParsedTransaction } from "./patterns";
import { parseWithAI } from "./ai-parser";

export interface ParseResult {
  email: FetchedEmail;
  parsed: ParsedTransaction | null;
  categoryName: string | null;
  method: "ai" | "pattern" | "failed";
}

/**
 * Parse emails using AI. Processes them in parallel with concurrency limit.
 */
export async function parseEmails(emails: FetchedEmail[]): Promise<ParseResult[]> {
  const CONCURRENCY = 5;
  const results: ParseResult[] = [];

  for (let i = 0; i < emails.length; i += CONCURRENCY) {
    const batch = emails.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (email) => {
        try {
          const parsed = await parseWithAI(email);
          if (parsed) {
            const { categoryName, classificationMethod, ...transaction } = parsed;
            return {
              email,
              parsed: transaction,
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
