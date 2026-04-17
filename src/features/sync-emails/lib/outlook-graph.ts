import type { FetchedEmail } from "./gmail";

// Keywords that indicate a financial email (broad matching)
const FINANCIAL_KEYWORDS = [
  "bancolombia", "nequi", "davivienda", "banco", "bank",
  "cajasocial", "avvillas", "bbva", "scotiabank", "colpatria",
  "transacción", "transaccion", "compra", "pago", "retiro",
  "transferencia", "débito", "debito", "crédito", "credito",
  "tarjeta", "cuenta", "saldo", "nómina", "nomina",
  "consignación", "consignacion", "PSE",
];

/**
 * Fetch emails from Outlook using Microsoft Graph API.
 * Fetches all recent emails and filters for financial content.
 */
export async function fetchOutlookGraphEmails(
  accessToken: string,
  lastSyncAt: string | null,
  maxResults: number = 50
): Promise<FetchedEmail[]> {
  const fetchCount = Math.min(Math.max(maxResults * 10, 100), 500);

  let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${fetchCount}&$orderby=receivedDateTime desc&$select=id,from,subject,receivedDateTime,body,bodyPreview`;

  if (lastSyncAt) {
    // Go back 5 minutes to avoid missing emails at the boundary
    const sinceDate = new Date(new Date(lastSyncAt).getTime() - 5 * 60 * 1000);
    url += `&$filter=receivedDateTime ge ${sinceDate.toISOString()}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="text"',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Graph API error:", res.status, text);
    return [];
  }

  const data = await res.json();
  if (!data.value || data.value.length === 0) {
    return [];
  }

  // Filter: keep emails that look financial (by sender domain or subject/body keywords)
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

  console.log(
    `Graph API: fetched ${data.value.length} emails, ${filtered.length} financial`
  );

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
        bodyText = bodyText
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
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
