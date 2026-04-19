export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/shared/api/supabase/service";
import { generateEmbedding } from "@/src/shared/api/embeddings";

/**
 * POST /api/learn-pattern
 * Records a global classification pattern when a user corrects a category.
 * If the pattern already exists, increments the corrections count and recalculates confidence.
 */
export async function POST(request: Request) {
  try {
    const { merchant, categoryName } = await request.json();

    if (!merchant || !categoryName) {
      return NextResponse.json(
        { error: "merchant and categoryName required" },
        { status: 400 }
      );
    }

    // Normalize: lowercase, trim, remove extra spaces
    const pattern = merchant.toLowerCase().trim().replace(/\s+/g, " ");

    if (pattern.length < 3) {
      return NextResponse.json({ skipped: true });
    }

    const supabase = createServiceClient();

    // Check if pattern already exists for this category
    const { data: existing } = await supabase
      .from("classification_patterns")
      .select("id, corrections_count")
      .eq("merchant_pattern", pattern)
      .eq("category_name", categoryName)
      .single();

    if (existing) {
      // Increment count and recalculate confidence
      const newCount = existing.corrections_count + 1;
      const confidence = Math.min(0.5 + newCount * 0.1, 0.99);

      await supabase
        .from("classification_patterns")
        .update({
          corrections_count: newCount,
          confidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Insert new pattern
      await supabase.from("classification_patterns").insert({
        merchant_pattern: pattern,
        category_name: categoryName,
        corrections_count: 1,
        confidence: 0.5,
      });
    }

    // Also store embedding for RAG-based semantic matching
    try {
      const embeddingText = `${pattern} ${categoryName}`;
      const embedding = await generateEmbedding(embeddingText);

      const { data: existingEmb } = await supabase
        .from("merchant_embeddings")
        .select("id, corrections_count")
        .eq("merchant_text", pattern)
        .eq("category_name", categoryName)
        .single();

      if (existingEmb) {
        await supabase
          .from("merchant_embeddings")
          .update({
            corrections_count: existingEmb.corrections_count + 1,
            embedding: JSON.stringify(embedding),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingEmb.id);
      } else {
        await supabase.from("merchant_embeddings").insert({
          merchant_text: pattern,
          category_name: categoryName,
          embedding: JSON.stringify(embedding),
          corrections_count: 1,
        });
      }
    } catch (embErr) {
      // Embedding storage is best-effort, don't fail the request
      console.error("Embedding storage failed:", embErr);
    }

    return NextResponse.json({ learned: true, pattern, categoryName });
  } catch (err) {
    console.error("Learn pattern error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
