import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { decrypt } from "@/src/shared/lib/crypto";
import { FINANCIAL_SENDERS } from "@/src/shared/config/constants";
import type { FetchedEmail } from "./gmail";

interface ImapAccountRow {
  id: string;
  user_id: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_password_encrypted: string;
  last_sync_at: string | null;
}

/**
 * Validate IMAP credentials by trying to connect.
 */
export async function validateImapConnection(
  host: string,
  port: number,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
  });

  try {
    await client.connect();
    await client.logout();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AUTHENTICATIONFAILED") || msg.includes("Invalid credentials")) {
      return { success: false, error: "Credenciales incorrectas. Si usas Gmail, necesitas una contraseña de aplicación." };
    }
    if (msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) {
      return { success: false, error: "No se pudo conectar al servidor de correo. Verifica tu conexión a internet." };
    }
    console.error("IMAP connection error:", err);
    return { success: false, error: `Error de conexión: ${msg}` };
  } finally {
    try { client.close(); } catch { /* ignore */ }
  }
}

/**
 * Fetch financial emails via IMAP.
 */
export async function fetchImapEmails(
  account: ImapAccountRow,
  maxResults: number = 50
): Promise<FetchedEmail[]> {
  const password = decrypt(account.imap_password_encrypted);

  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: true,
    auth: { user: account.email, pass: password },
    logger: false,
  });

  const emails: FetchedEmail[] = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for emails from financial senders in the last 30 days
      const since = account.last_sync_at
        ? new Date(account.last_sync_at)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Build OR search for all financial senders
      const searchCriteria: { or: { from: string }[] } & { since: Date } = {
        or: FINANCIAL_SENDERS.map((sender) => ({ from: sender })),
        since,
      };

      let count = 0;

      for await (const message of client.fetch(
        { ...searchCriteria } as never,
        { source: true, uid: true },
        { uid: true }
      )) {
        if (count >= maxResults) break;

        try {
          if (!message.source) continue;
          const parsed = await simpleParser(message.source);

          const fromAddress =
            parsed.from?.value?.[0]?.address?.toLowerCase() ?? "";

          // Filter: only financial senders
          const isFinancial = FINANCIAL_SENDERS.some((s) =>
            fromAddress.includes(s)
          );
          if (!isFinancial) continue;

          const bodyText =
            parsed.text ??
            (parsed.html
              ? parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
              : "");

          emails.push({
            messageId: parsed.messageId ?? `imap-${message.uid}`,
            from: fromAddress,
            subject: parsed.subject ?? "",
            date: parsed.date?.toISOString() ?? new Date().toISOString(),
            bodyText,
            snippet: bodyText.slice(0, 200),
          });

          count++;
        } catch {
          // Skip unparseable messages
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("IMAP fetch error:", err);
    // If the simple search fails, try a broader approach
    try {
      await client.logout();
    } catch {
      // already disconnected
    }
  }

  return emails;
}
