import { decrypt, encrypt } from "@/src/shared/lib/crypto";
import { FINANCIAL_SENDERS } from "@/src/shared/config/constants";
import { createServiceClient } from "@/src/shared/api/supabase/service";

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { mimeType: string; body: { data?: string } }[];
  };
  internalDate: string;
}

interface EmailAccountRow {
  id: string;
  user_id: string;
  email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  last_history_id: string | null;
}

async function refreshAccessToken(
  refreshTokenEncrypted: string,
  accountId: string
): Promise<string> {
  const refreshToken = decrypt(refreshTokenEncrypted);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Gmail token refresh failed: ${JSON.stringify(data)}`);
  }

  // Update encrypted token in DB
  const supabase = createServiceClient();
  await supabase
    .from("email_accounts")
    .update({
      access_token_encrypted: encrypt(data.access_token),
      token_expires_at: new Date(
        Date.now() + data.expires_in * 1000
      ).toISOString(),
    })
    .eq("id", accountId);

  return data.access_token;
}

async function getValidAccessToken(account: EmailAccountRow): Promise<string> {
  const expiresAt = new Date(account.token_expires_at).getTime();
  const now = Date.now();

  // Refresh if expires within 5 minutes
  if (now > expiresAt - 5 * 60 * 1000) {
    return refreshAccessToken(
      account.refresh_token_encrypted,
      account.id
    );
  }

  return decrypt(account.access_token_encrypted);
}

export interface FetchedEmail {
  messageId: string;
  from: string;
  subject: string;
  date: string;
  bodyText: string;
  snippet: string;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function extractBody(payload: GmailMessage["payload"]): string {
  // Try plain text body first
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Try parts
  if (payload.parts) {
    const textPart = payload.parts.find(
      (p) => p.mimeType === "text/plain" && p.body.data
    );
    if (textPart?.body.data) {
      return decodeBase64Url(textPart.body.data);
    }

    const htmlPart = payload.parts.find(
      (p) => p.mimeType === "text/html" && p.body.data
    );
    if (htmlPart?.body.data) {
      const html = decodeBase64Url(htmlPart.body.data);
      // Strip HTML tags for basic text extraction
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  return "";
}

function getHeader(
  headers: { name: string; value: string }[],
  name: string
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/**
 * Fetch new financial emails from Gmail for a given account.
 * Uses the Gmail API search to filter by financial senders.
 */
export async function fetchGmailEmails(
  account: EmailAccountRow,
  maxResults: number = 50
): Promise<FetchedEmail[]> {
  const accessToken = await getValidAccessToken(account);

  // Build query: from financial senders, newer than last sync
  const senderQuery = FINANCIAL_SENDERS.map((s) => `from:${s}`).join(" OR ");
  const query = `(${senderQuery})`;

  const searchParams = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });

  // If we have a history ID, use it for incremental sync
  // Otherwise search recent emails (last 30 days)
  if (!account.last_history_id) {
    searchParams.set(
      "q",
      `${query} newer_than:30d`
    );
  }

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${searchParams}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();

  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch full message content for each
  const emails: FetchedEmail[] = [];

  for (const msg of listData.messages) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const msgData: GmailMessage = await msgRes.json();

    const from = getHeader(msgData.payload.headers, "From");
    const subject = getHeader(msgData.payload.headers, "Subject");
    const date = getHeader(msgData.payload.headers, "Date");
    const bodyText = extractBody(msgData.payload);

    emails.push({
      messageId: msgData.id,
      from,
      subject,
      date,
      bodyText,
      snippet: msgData.snippet,
    });
  }

  return emails;
}
