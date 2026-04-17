import { createServiceClient } from "@/src/shared/api/supabase/service";
import type { FetchedEmail } from "./gmail";

const FINANCIAL_KEYWORDS = [
  "bancolombia", "nequi", "davivienda", "banco", "bank", "nu",
  "cajasocial", "avvillas", "bbva", "scotiabank", "colpatria",
  "transacción", "transaccion", "compra", "pago", "retiro",
  "transferencia", "débito", "debito", "crédito", "credito",
  "tarjeta", "cuenta", "saldo", "nómina", "nomina",
  "consignación", "consignacion", "PSE",
];

/**
 * Refresh Microsoft access token using refresh_token + client credentials.
 */
async function refreshMicrosoftToken(
  refreshToken: string,
  accountId: string
): Promise<string | null> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "openid email profile User.Read Mail.Read offline_access",
        }),
      }
    );

    const data = await res.json();
    if (!data.access_token) {
      console.error("Token refresh failed:", data.error_description ?? data.error);
      return null;
    }

    // Update tokens in DB
    const supabase = createServiceClient();
    const updates: Record<string, string> = {
      provider_token_encrypted: data.access_token,
    };
    if (data.refresh_token) {
      updates.provider_refresh_token_encrypted = data.refresh_token;
    }
    await supabase.from("email_accounts").update(updates).eq("id", accountId);

    console.log("Microsoft token refreshed successfully");
    return data.access_token;
  } catch (err) {
    console.error("Token refresh error:", err);
    return null;
  }
}

/**
 * Get a valid access token — use stored one, refresh if expired.
 */
async function getValidToken(
  accessToken: string,
  refreshToken: string | null,
  accountId: string
): Promise<string | null> {
  // Test current token
  const testRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (testRes.ok) return accessToken;

  // Token expired — try refresh
  if (refreshToken) {
    console.log("Access token expired, refreshing...");
    return refreshMicrosoftToken(refreshToken, accountId);
  }

  console.error("Token expired and no refresh token available");
  return null;
}

/**
 * Fetch emails from Outlook using Microsoft Graph API.
 */
export async function fetchOutlookGraphEmails(
  accessToken: string,
  lastSyncAt: string | null,
  maxResults: number = 50,
  refreshToken?: string | null,
  accountId?: string
): Promise<FetchedEmail[]> {
  // Get valid token (refresh if needed)
  const validToken = accountId
    ? await getValidToken(accessToken, refreshToken ?? null, accountId)
    : accessToken;

  if (!validToken) return [];

  const fetchCount = Math.min(Math.max(maxResults * 10, 100), 500);

  let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${fetchCount}&$orderby=receivedDateTime desc&$select=id,from,subject,receivedDateTime,body,bodyPreview`;

  if (lastSyncAt) {
    const sinceDate = new Date(new Date(lastSyncAt).getTime() - 5 * 60 * 1000);
    url += `&$filter=receivedDateTime ge ${sinceDate.toISOString()}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${validToken}`,
      Prefer: 'outlook.body-content-type="text"',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Graph API error:", res.status, text.slice(0, 200));
    return [];
  }

  const data = await res.json();
  if (!data.value || data.value.length === 0) {
    return [];
  }

  const filtered = data.value.filter(
    (msg: {
      from?: { emailAddress?: { address?: string } };
      subject?: string;
      bodyPreview?: string;
    }) => {
      const from = msg.from?.emailAddress?.address?.toLowerCase() ?? "";
      const subject = (msg.subject ?? "").toLowerCase();
      const preview = (msg.bodyPreview ?? "").toLowerCase();
      const combined = `${from} ${subject} ${preview}`;
      return FINANCIAL_KEYWORDS.some((kw) => combined.includes(kw.toLowerCase()));
    }
  );

  if (filtered.length === 0 && data.value.length > 0) {
    const sample = data.value.slice(0, 3).map((m: { from?: { emailAddress?: { address?: string } }; subject?: string }) =>
      `${m.from?.emailAddress?.address?.slice(0, 30)} | ${(m.subject ?? '').slice(0, 40)}`
    );
    console.log(`Graph API: fetched ${data.value.length}, 0 financial. Sample: ${sample.join(' /// ')}`);
  } else {
    console.log(`Graph API: fetched ${data.value.length} emails, ${filtered.length} financial`);
  }

  return filtered.slice(0, maxResults).map(
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
