export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/shared/api/supabase/service";
import { fetchImapEmails } from "@/src/features/sync-emails/lib/imap";
import { fetchOutlookGraphEmails } from "@/src/features/sync-emails/lib/outlook-graph";
import { parseEmails } from "@/src/features/sync-emails/lib/parser";
import { sendPushToUser } from "@/src/shared/lib/push-sender";
import { formatCOP } from "@/src/shared/lib/currency";
import { getBankBrand } from "@/src/shared/config/bank-brands";

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

/**
 * Payroll payments received in the last 5 days of a month belong to next month's budget.
 * Shifts their transaction_date to the 1st of the following month.
 */
function adjustPayrollDate(parsed: { type: string; description: string | null; merchant: string }, txDate: Date): Date {
  const PAYROLL_KEYWORDS = ["nómina", "nomina", "pago de nomina", "pago de nómina"];
  const text = `${parsed.description ?? ""} ${parsed.merchant}`.toLowerCase();
  const isPayroll = parsed.type === "income" && PAYROLL_KEYWORDS.some((kw) => text.includes(kw));

  if (!isPayroll) return txDate;

  const daysInMonth = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - txDate.getDate();

  if (daysLeft < 5) {
    // Midnight Colombia (UTC-5) on the 1st of next month
    return new Date(Date.UTC(txDate.getFullYear(), txDate.getMonth() + 1, 1, 5));
  }

  return txDate;
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
      console.log(`Sync account: ${account.email} | provider: ${account.provider} | maxEmails: ${maxEmails}`);
      let emails;
      if (account.imap_host && account.imap_password_encrypted) {
        emails = await fetchImapEmails(account, maxEmails);
      } else if (account.provider === "outlook" && account.provider_token_encrypted) {
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

      // 2. Deduplicate — skip emails already processed
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

      if (newEmails.length === 0) {
        console.log(`All ${emails.length} emails already processed, skipping`);
        await updateSyncLog(supabase, syncLog?.id, "success", logEntry.processed, 0);
        results.push(logEntry);
        continue;
      }

      // 3. Parse + classify emails with AI (single call per email)
      console.log(`Parsing ${newEmails.length} new emails with AI (${existingIds.size} already processed)...`);
      const parseResults = await parseEmails(newEmails, account.user_id);

      for (const r of parseResults) {
        console.log(`AI result: parsed=${!!r.parsed} ${r.parsed ? `type=${r.parsed.type} amount=${r.parsed.amount} merchant=${r.parsed.merchant} category=${r.categoryName}` : 'no_transaction'}`);
      }

      // 4. Get user categories to map names → IDs
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", account.user_id);

      const categoryMap = new Map(
        categories?.map((c) => [c.name, c.id]) ?? []
      );

      // 5. Save parsed transactions
      for (const result of parseResults) {
        if (!result.parsed) continue;

        try {
          const categoryId = categoryMap.get(result.categoryName ?? "") ?? null;

          // Auto-detect and link bank account
          let bankAccountId: string | null = null;
          if (result.parsed.cardLastFour) {
            const { data: existingBank } = await supabase
              .from("bank_accounts")
              .select("id")
              .eq("user_id", account.user_id)
              .eq("identifier", result.parsed.cardLastFour)
              .single();

            if (existingBank) {
              bankAccountId = existingBank.id;
            } else {
              const emailDomain = result.email.from?.split("@")[1]?.split(".")[0] ?? "";
              const brand = getBankBrand(emailDomain);
              const { data: newBank } = await supabase
                .from("bank_accounts")
                .insert({
                  user_id: account.user_id,
                  identifier: result.parsed.cardLastFour,
                  bank_name: brand.name !== "Banco" ? emailDomain : emailDomain,
                  is_tracked: true,
                  track_expenses: true,
                  track_income: true,
                })
                .select("id")
                .single();
              bankAccountId = newBank?.id ?? null;
            }
          }

          const { error: insertError } = await supabase.from("transactions").insert({
            user_id: account.user_id,
            email_account_id: account.id,
            type: result.parsed.type,
            amount: result.parsed.amount,
            merchant: result.parsed.merchant,
            description: result.parsed.description,
            category_id: categoryId,
            transaction_date: adjustPayrollDate(result.parsed, result.parsed.transactionDate).toISOString(),
            classification_method: result.method === "pattern" ? "pattern" : "ai",
            email_message_id: result.email.messageId,
            raw_email_snippet: result.email.snippet?.slice(0, 500),
            card_last_four: result.parsed.cardLastFour,
            bank_account_id: bankAccountId,
            exclude_from_totals: result.parsed.excludeFromTotals ?? false,
          });

          if (insertError) {
            console.error(`Insert error: ${insertError.message}`);
            continue;
          }

          console.log(`Saved: ${result.parsed.type} $${result.parsed.amount} ${result.parsed.merchant.slice(0, 25)} → ${result.categoryName}`);
          logEntry.created++;
        } catch (err) {
          logEntry.errors.push(
            `Failed to save ${result.email.messageId}: ${err}`
          );
        }
      }

      // 6. Send push notifications for large/unusual expenses
      await sendTransactionNotifications(supabase, account.user_id, parseResults);

      // 7. Update last_sync_at checkpoint
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

  // Close previous month's savings history if we're in a new month
  await closePreviousMonthSavings(supabase);

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
  parseResults: { parsed: { type: string; amount: number; merchant: string; description?: string | null } | null }[]
) {
  try {
    // Payroll arrival notification
    const PAYROLL_KEYWORDS = ["nómina", "nomina", "pago de nomina", "pago de nómina"];
    for (const result of parseResults) {
      if (
        result.parsed &&
        result.parsed.type === "income" &&
        PAYROLL_KEYWORDS.some((kw) =>
          `${result.parsed!.description ?? ""} ${result.parsed!.merchant}`
            .toLowerCase()
            .includes(kw)
        )
      ) {
        await sendPushToUser(userId, {
          title: "Tu nómina llegó",
          body: `Recibiste ${formatCOP(result.parsed.amount)} — define tu meta de ahorro`,
          tag: "payroll-arrived",
          url: "/dashboard",
        }).catch(() => {});
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("notify_large_expense, notify_large_expense_threshold, notify_budget_alert")
      .eq("id", userId)
      .single();

    if (!profile) return;

    const threshold = profile.notify_large_expense_threshold ?? 500000;

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

/**
 * At the start of each month, close the previous month's savings_history
 * by computing actual_savings (income - expenses) and whether the goal was met.
 */
async function closePreviousMonthSavings(
  supabase: ReturnType<typeof createServiceClient>
) {
  try {
    const now = new Date();
    // Only run in the first 5 days of a month
    if (now.getDate() > 5) return;

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    // Find savings_history records for prev month that haven't been closed
    const { data: openRecords } = await supabase
      .from("savings_history")
      .select("id, user_id, goal")
      .eq("month", monthKey)
      .is("actual_savings", null);

    if (!openRecords || openRecords.length === 0) return;

    const prevStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const prevEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59);

    for (const record of openRecords) {
      const { data: txns } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", record.user_id)
        .gte("transaction_date", prevStart.toISOString())
        .lte("transaction_date", prevEnd.toISOString());

      if (!txns) continue;

      const income = txns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expenses = txns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      const actualSavings = income - expenses;

      await supabase
        .from("savings_history")
        .update({
          actual_savings: actualSavings,
          met: actualSavings >= record.goal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);
    }

    console.log(`Closed ${openRecords.length} savings records for ${monthKey}`);
  } catch (err) {
    console.error("Error closing savings history:", err);
  }
}
