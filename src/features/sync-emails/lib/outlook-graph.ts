import { createServiceClient } from "@/src/shared/api/supabase/service";
import type { FetchedEmail } from "./gmail";

// Sender domains that send transaction notifications (not marketing)
const FINANCIAL_SENDERS = [
  "alertasynotificaciones@bancolombia.com.co",
  "alertasynotificaciones@an.notificacionesbancolombia.com",
  "notificaciones@nequi.com",
  "alertas@davivienda.com", "notificaciones@davivienda.com",
  "alertas@bancocajasocial.com", "notificaciones@avvillas.com.co",
  "alertas@bbva.com.co", "notificaciones@scotiabank.com.co",
  "notificaciones@colpatria.com", "alertas@bancodebogota.com",
  "notificaciones@bancodeoccidente.com", "alertas@bancopopular.com",
  "notificaciones@bancoagrario.com", "notificaciones@itau.co",
  "notificaciones@gnbsudameris.com", "notificaciones@pichincha.com",
  "notificaciones@bancofalabella.com", "notificaciones@finandina.com",
  "notificaciones@serfinanza.com", "notificaciones@bancoomeva.com",
  "notificaciones@bancamia.com",
  "soporte@addi.com", "noreply@addi.com",
  "noreply@lulo.bank", "notificaciones@rappipay.co",
  "notificaciones@daviplata.com", "notificaciones@movii.co",
  "noreply@dale.co", "noreply@uala.com.co",
  "notificaciones@nu.com.co", "noreply@soynu.com.co",
];

// Keywords that indicate an actual transaction in the email body/subject
const TRANSACTION_KEYWORDS = [
  "compraste", "pagaste", "retiraste", "transferiste",
  "te enviaron", "recibiste", "te consignaron",
  "compra por", "pago por", "retiro por", "transferencia por",
  "débito automático", "debito automatico",
  "nómina", "nomina", "consignación", "consignacion",
  "tu cuenta *", "t.deb *", "t.cred *", "tarjeta *",
];

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
    const supabase = createServiceClient();
    const updates: Record<string, string> = { provider_token_encrypted: data.access_token };
    if (data.refresh_token) updates.provider_refresh_token_encrypted = data.refresh_token;
    await supabase.from("email_accounts").update(updates).eq("id", accountId);
    console.log("Microsoft token refreshed");
    return data.access_token;
  } catch (err) {
    console.error("Token refresh error:", err);
    return null;
  }
}

async function getValidToken(
  accessToken: string,
  refreshToken: string | null,
  accountId: string
): Promise<string | null> {
  console.log(`getValidToken: token=${accessToken.slice(0, 20)}... refresh=${refreshToken ? 'yes' : 'no'}`);
  const testRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (testRes.ok) {
    console.log("Token valid");
    return accessToken;
  }
  console.log(`Token invalid (${testRes.status}), attempting refresh...`);
  if (refreshToken) {
    return refreshMicrosoftToken(refreshToken, accountId);
  }
  console.error("No refresh token available");
  return null;
}

export async function fetchOutlookGraphEmails(
  accessToken: string,
  lastSyncAt: string | null,
  maxResults: number = 50,
  refreshToken?: string | null,
  accountId?: string
): Promise<FetchedEmail[]> {
  const validToken = accountId
    ? await getValidToken(accessToken, refreshToken ?? null, accountId)
    : accessToken;
  if (!validToken) return [];

  // Step 1: Fetch email headers (lightweight — no body)
  const fetchCount = Math.min(Math.max(maxResults * 10, 100), 500);
  let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${fetchCount}&$orderby=receivedDateTime%20desc&$select=id,from,subject,receivedDateTime,bodyPreview`;

  // Always look back at least 20 days to catch all bank emails
  const minWindow = 20 * 24 * 60 * 60 * 1000;
  if (lastSyncAt) {
    const elapsed = Date.now() - new Date(lastSyncAt).getTime();
    const lookback = Math.max(elapsed + 5 * 60 * 1000, minWindow);
    const sinceDate = new Date(Date.now() - lookback);
    url += `&$filter=receivedDateTime%20ge%20${sinceDate.toISOString()}`;
  }

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${validToken}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    console.error("Graph API list error:", listRes.status, errText.slice(0, 200));
    return [];
  }

  const listData = await listRes.json();
  const allMessages = listData.value ?? [];
  console.log(`Graph API list: ${allMessages.length} messages returned`);

  if (allMessages.length === 0) return [];

  // Step 2: Filter — match by known sender OR transaction keywords in body
  const financialMessages = allMessages.filter(
    (msg: { from?: { emailAddress?: { address?: string } }; subject?: string; bodyPreview?: string }) => {
      const from = msg.from?.emailAddress?.address?.toLowerCase() ?? "";
      const subject = (msg.subject ?? "").toLowerCase();
      const preview = (msg.bodyPreview ?? "").toLowerCase();

      // Match if sender is a known financial notification sender
      const isFinancialSender = FINANCIAL_SENDERS.some((s) => from.includes(s));
      if (isFinancialSender) return true;

      // Match if body/subject contains transaction keywords (not just bank name)
      const content = `${subject} ${preview}`;
      return TRANSACTION_KEYWORDS.some((kw) => content.includes(kw));
    }
  );

  console.log(`Graph API: ${allMessages.length} total, ${financialMessages.length} financial`);

  if (financialMessages.length === 0) {
    if (allMessages.length > 0) {
      const sample = allMessages.slice(0, 3).map(
        (m: { from?: { emailAddress?: { address?: string } }; subject?: string }) =>
          `${m.from?.emailAddress?.address?.slice(0, 30)}|${(m.subject ?? "").slice(0, 30)}`
      );
      console.log("Sample:", sample.join(" /// "));
    }
    return [];
  }

  // Step 3: Fetch full body only for financial emails
  const emails: FetchedEmail[] = [];
  for (const msg of financialMessages.slice(0, maxResults)) {
    try {
      const detailRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${msg.id}?$select=id,from,subject,receivedDateTime,body,bodyPreview`,
        {
          headers: {
            Authorization: `Bearer ${validToken}`,
            Prefer: 'outlook.body-content-type="text"',
          },
        }
      );
      if (!detailRes.ok) continue;
      const detail = await detailRes.json();

      let bodyText = detail.body?.content ?? "";
      if (detail.body?.contentType === "html") {
        bodyText = bodyText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }

      emails.push({
        messageId: detail.id,
        from: detail.from?.emailAddress?.address ?? "",
        subject: detail.subject ?? "",
        date: detail.receivedDateTime ?? "",
        bodyText,
        snippet: detail.bodyPreview ?? "",
      });
    } catch {
      // Skip individual email errors
    }
  }

  return emails;
}
