export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/shared/api/supabase/service";
import { generateEmbedding } from "@/src/shared/api/embeddings";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/save-user-rule
 * Saves a per-user classification rule with embedding for RAG matching.
 */
export async function POST(request: Request) {
  try {
    const { merchant, categoryName, ruleDescription, includeInExpenses, includeInIncome } =
      await request.json();

    if (!merchant || !categoryName) {
      return NextResponse.json(
        { error: "merchant and categoryName required" },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: (await cookies()).toString(),
          },
        },
      }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pattern = merchant.toLowerCase().trim().replace(/\s+/g, " ");
    if (pattern.length < 3) {
      return NextResponse.json({ skipped: true });
    }

    const supabase = createServiceClient();

    // Generate embedding for semantic matching
    let embedding: number[] | null = null;
    try {
      const embeddingText = `${pattern} ${categoryName} ${ruleDescription ?? ""}`.trim();
      embedding = await generateEmbedding(embeddingText);
    } catch (err) {
      console.error("Embedding generation failed:", err);
    }

    // Upsert the rule
    await supabase.from("user_rules").upsert(
      {
        user_id: user.id,
        merchant_pattern: pattern,
        category_name: categoryName,
        rule_description: ruleDescription || null,
        include_in_expenses: includeInExpenses ?? true,
        include_in_income: includeInIncome ?? true,
        ...(embedding ? { embedding: JSON.stringify(embedding) } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,merchant_pattern" }
    );

    return NextResponse.json({ saved: true, pattern, categoryName });
  } catch (err) {
    console.error("Save user rule error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
