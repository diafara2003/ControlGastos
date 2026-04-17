import { FINANCIAL_SENDERS } from "@/src/shared/config/constants";
import type { FetchedEmail } from "./gmail";

/**
 * Fetch financial emails from Outlook using Microsoft Graph API.
 * Uses the provider_token from Supabase auth session.
 */
export async function fetchOutlookGraphEmails(
  accessToken: string,
  lastSyncAt: string | null,
  maxResults: number = 50
): Promise<FetchedEmail[]> {
  // Build OData filter for financial senders
  const senderFilter = FINANCIAL_SENDERS.map(
    (s) => `from/emailAddress/address eq '${s}'`
  ).join(" or ");

  let filter = `(${senderFilter})`;

  // If no last sync, limit to last 30 days
  const since = lastSyncAt
    ? new Date(lastSyncAt).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  filter += ` and receivedDateTime ge ${since}`;

  const params = new URLSearchParams({
    $filter: filter,
    $top: String(maxResults),
    $orderby: "receivedDateTime desc",
    $select: "id,from,subject,receivedDateTime,body,bodyPreview",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Graph API error:", res.status, text);
    return [];
  }

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
