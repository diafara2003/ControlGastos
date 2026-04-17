export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/shared/api/supabase/service";
import { fetchImapEmails } from "@/src/features/sync-emails/lib/imap";
import { fetchOutlookGraphEmails } from "@/src/features/sync-emails/lib/outlook-graph";
import { parseEmails } from "@/src/features/sync-emails/lib/parser";
import { parseWithAI } from "@/src/features/sync-emails/lib/ai-parser";
import { classifyTransaction } from "@/src/features/classify-transaction";
import { sendPushToUser } from "@/src/shared/lib/push-sender";
import { formatCOP } from "@/src/shared/lib/currency";

export const maxDuration = 60; // Vercel function timeout

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return syncAllAccounts();
}

// Also support POST for manual sync from settings
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  const maxEmails = (body.maxEmails as number) ?? 20;

  return syncAllAccounts(userId, maxEmails);
}

async function syncAllAccounts(filterUserId?: string, maxEmails: number = 20) {
  const supabase = createServiceClient();
  const results: {
    accountId: string;
    email: string;
    processed: number;
    created: number;
    errors: string[];
  }[] = [];

  // Fetch active email accounts
  let query = supabase
    .from("email_accounts")
    .select("*")
    .eq("is_active", true);

  if (filterUserId) {
    query = query.eq("user_id", filterUserId);
  }

  const { data: accounts, error: fetchError } = await query;
  if (fetchError || !accounts) {
    return NextResponse.json(
      { error: fetchError?.message ?? "No accounts found" },
      { status: 500 }
    );
  }

  for (const account of accounts) {
    const logEntry = {
      accountId: account.id,
      email: account.email,
      processed: 0,
      created: 0,
      errors: [] as string[],
    };

    // Create sync log
    const { data: syncLog } = await supabase
      .from("sync_logs")
      .insert({
        user_id: account.user_id,
        email_account_id: account.id,
        status: "success",
        emails_processed: 0,
        transactions_created: 0,
      })
      .select("id")
      .single();

    try {
      // 1. Fetch emails — IMAP for Gmail, Graph API for Outlook
      console.log(`Sync account: ${account.email} | provider: ${account.provider} | imap: ${!!account.imap_host} | token: ${!!account.provider_token_encrypted} | maxEmails: ${maxEmails}`);
      let emails;
      if (account.imap_host && account.imap_password_encrypted) {
        // Has IMAP credentials (Gmail, etc.)
        emails = await fetchImapEmails(account, maxEmails);
      } else if (account.provider === "outlook" && account.provider_token_encrypted) {
        // Outlook via Graph API — with auto token refresh
        emails = await fetchOutlookGraphEmails(
          account.provider_token_encrypted,
          account.last_sync_at,
          maxEmails,
          account.provider_refresh_token_encrypted,
          account.id
        );
      } else {
        console.log(`Skipping account: no credentials for ${account.email}`);
        logEntry.errors.push("No IMAP credentials configured");
        results.push(logEntry);
        continue;
      }

      console.log(`Fetched ${emails.length} emails for ${account.email}`);
      logEntry.processed = emails.length;

      if (emails.length === 0) {
        await updateSyncLog(supabase, syncLog?.id, "success", 0, 0);
        results.push(logEntry);
        continue;
      }

      // 2. Check for already-processed emails (deduplication)
      const messageIds = emails.map((e) => e.messageId);
      const { data: existing } = await supabase
        .from("transactions")
        .select("email_message_id")
        .in("email_message_id", messageIds);

      const existingIds = new Set(
        existing?.map((e) => e.email_message_id) ?? []
      );
      const newEmails = emails.filter(
        (e) => !existingIds.has(e.messageId)
      );

      // 3. Parse emails
      const parseResults = parseEmails(newEmails);

      // 4. AI fallback for failed parses
      for (const result of parseResults) {
        if (!result.parsed) {
          const aiParsed = await parseWithAI(result.email);
          if (aiParsed) {
            result.parsed = aiParsed;
            result.method = "ai";
          }
        }
      }

      // 5. Get user categories for classification
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", account.user_id);

      const categoryMap = new Map(
        categories?.map((c) => [c.name, c.id]) ?? []
      );

      // 6. Classify and save each parsed transaction
      for (const result of parseResults) {
        if (!result.parsed) continue;

        try {
          const classification = await classifyTransaction(
            result.parsed,
            account.user_id
          );

          const categoryId = categoryMap.get(classification.categoryName) ?? null;

          const { error: insertError } = await supabase.from("transactions").upsert(
            {
              user_id: account.user_id,
              email_account_id: account.id,
              type: result.parsed.type,
              amount: result.parsed.amount,
              merchant: result.parsed.merchant,
              description: result.parsed.description,
              category_id: categoryId,
              transaction_date: result.parsed.transactionDate.toISOString(),
              classification_method:
                classification.method === "none"
                  ? null
                  : classification.method,
              email_message_id: result.email.messageId,
              raw_email_snippet: result.email.snippet?.slice(0, 500),
              card_last_four: result.parsed.cardLastFour,
            },
            { onConflict: "user_id,email_message_id", ignoreDuplicates: true }
          );

          if (insertError) {
            // Skip duplicates silently
            if (!insertError.message.includes("duplicate")) {
              throw insertError;
            }
            continue;
          }

          logEntry.created++;
        } catch (err) {
          logEntry.errors.push(
            `Failed to save ${result.email.messageId}: ${err}`
          );
        }
      }

      // 7. Send push notifications for large/unusual expenses
      await sendTransactionNotifications(supabase, account.user_id, parseResults);

      // 8. Update last_sync_at
      await supabase
        .from("email_accounts")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", account.id);

      await updateSyncLog(
        supabase,
        syncLog?.id,
        logEntry.errors.length > 0 ? "partial" : "success",
        logEntry.processed,
        logEntry.created,
        logEntry.errors.join("; ") || null
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logEntry.errors.push(errMsg);

      await updateSyncLog(
        supabase,
        syncLog?.id,
        "error",
        logEntry.processed,
        logEntry.created,
        errMsg
      );
    }

    results.push(logEntry);
  }

  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  return NextResponse.json({
    message: "Sync completed",
    accounts: results.length,
    totalCreated,
    results,
  });
}

async function sendTransactionNotifications(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  parseResults: { parsed: { type: string; amount: number; merchant: string } | null }[]
) {
  try {
    // Get user notification preferences
    const { data: profile } = await supabase
      .from("profiles")
      .select("notify_large_expense, notify_large_expense_threshold, notify_budget_alert")
      .eq("id", userId)
      .single();

    if (!profile) return;

    const threshold = profile.notify_large_expense_threshold ?? 500000;

    // Check for large expenses
    if (profile.notify_large_expense) {
      for (const result of parseResults) {
        if (
          result.parsed &&
          result.parsed.type === "expense" &&
          result.parsed.amount >= threshold
        ) {
          await sendPushToUser(userId, {
            title: "Gasto grande detectado",
            body: `${result.parsed.merchant}: ${formatCOP(result.parsed.amount)}`,
            tag: "large-expense",
            url: "/transactions",
          }).catch(() => {});
        }
      }
    }

    // Check budget alerts
    if (profile.notify_budget_alert) {
      const { data: budgetProgress } = await supabase.rpc("get_budget_progress");
      if (budgetProgress) {
        for (const b of budgetProgress as { category_name: string; percentage: number }[]) {
          if (b.percentage >= 80 && b.percentage < 100) {
            await sendPushToUser(userId, {
              title: "Presupuesto al límite",
              body: `${b.category_name}: ${Math.round(b.percentage)}% usado`,
              tag: `budget-${b.category_name}`,
              url: "/categories",
            }).catch(() => {});
          } else if (b.percentage >= 100) {
            await sendPushToUser(userId, {
              title: "Presupuesto excedido",
              body: `${b.category_name}: ${Math.round(b.percentage)}% del límite`,
              tag: `budget-${b.category_name}`,
              url: "/categories",
            }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

async function updateSyncLog(
  supabase: ReturnType<typeof createServiceClient>,
  logId: string | undefined,
  status: string,
  processed: number,
  created: number,
  errorMessage?: string | null
) {
  if (!logId) return;
  await supabase
    .from("sync_logs")
    .update({
      status,
      emails_processed: processed,
      transactions_created: created,
      error_message: errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", logId);
}
