import { decrypt, encrypt } from "@/src/shared/lib/crypto";
import { FINANCIAL_SENDERS } from "@/src/shared/config/constants";
import { createServiceClient } from "@/src/shared/api/supabase/service";
import type { FetchedEmail } from "./gmail";

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

  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Mail.Read User.Read offline_access",
      }),
    }
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Outlook token refresh failed: ${JSON.stringify(data)}`);
  }

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

  if (now > expiresAt - 5 * 60 * 1000) {
    return refreshAccessToken(account.refresh_token_encrypted, account.id);
  }

  return decrypt(account.access_token_encrypted);
}

/**
 * Fetch new financial emails from Outlook using MS Graph API.
 */
export async function fetchOutlookEmails(
  account: EmailAccountRow,
  maxResults: number = 50
): Promise<FetchedEmail[]> {
  const accessToken = await getValidAccessToken(account);

  // Build OData filter for financial senders
  const senderFilter = FINANCIAL_SENDERS.map(
    (s) => `from/emailAddress/address eq '${s}'`
  ).join(" or ");

  const params = new URLSearchParams({
    $filter: `(${senderFilter})`,
    $top: String(maxResults),
    $orderby: "receivedDateTime desc",
    $select: "id,from,subject,receivedDateTime,body,bodyPreview",
  });

  // If no last sync, limit to last 30 days
  if (!account.last_history_id) {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    params.set(
      "$filter",
      `(${senderFilter}) and receivedDateTime ge ${thirtyDaysAgo}`
    );
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  if (!data.value || data.value.length === 0) {
    return [];
  }

  return data.value.map(
    (msg: {
      id: string;
      from: { emailAddress: { address: string } };
      subject: string;
      receivedDateTime: string;
      body: { content: string; contentType: string };
      bodyPreview: string;
    }) => {
      let bodyText = msg.body.content;
      if (msg.body.contentType === "html") {
        bodyText = bodyText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }

      return {
        messageId: msg.id,
        from: msg.from.emailAddress.address,
        subject: msg.subject,
        date: msg.receivedDateTime,
        bodyText,
        snippet: msg.bodyPreview,
      } satisfies FetchedEmail;
    }
  );
}
