import { FINANCIAL_SENDERS } from "@/src/shared/config/constants";
import type { FetchedEmail } from "./gmail";

/**
 * Fetch financial emails from Outlook using Microsoft Graph API.
 * Strategy: fetch latest N emails, filter by bank sender in code.
 */
export async function fetchOutlookGraphEmails(
  accessToken: string,
  lastSyncAt: string | null,
  maxResults: number = 50
): Promise<FetchedEmail[]> {
  // Always fetch enough emails to find bank senders (they may be buried)
  const fetchCount = Math.min(Math.max(maxResults * 10, 100), 500);

  let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${fetchCount}&$orderby=receivedDateTime desc&$select=id,from,subject,receivedDateTime,body,bodyPreview`;

  // If we have a last sync date, filter by it
  if (lastSyncAt) {
    const since = new Date(lastSyncAt).toISOString();
    url += `&$filter=receivedDateTime ge ${since}`;
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

  // Filter by financial senders in code
  const senderLower = FINANCIAL_SENDERS.map((s) => s.toLowerCase());

  const filtered = data.value.filter(
    (msg: { from?: { emailAddress?: { address?: string } } }) => {
      const from = msg.from?.emailAddress?.address?.toLowerCase() ?? "";
      return senderLower.some((s) => from.includes(s));
    }
  );

  console.log(
    `Graph API: fetched ${data.value.length} emails, ${filtered.length} from banks`
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
