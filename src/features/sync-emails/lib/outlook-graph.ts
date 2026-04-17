import { FINANCIAL_SENDERS } from "@/src/shared/config/constants";
import type { FetchedEmail } from "./gmail";

/**
 * Fetch financial emails from Outlook using Microsoft Graph API.
 * Searches by keyword in subject/body since Graph API limits complex sender filters.
 */
export async function fetchOutlookGraphEmails(
  accessToken: string,
  lastSyncAt: string | null,
  maxResults: number = 50
): Promise<FetchedEmail[]> {
  // Use $search for broad keyword matching (much more efficient than $filter with contains)
  // Then filter by sender in code
  const since = lastSyncAt
    ? new Date(lastSyncAt).toISOString()
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  // Search for banking keywords
  const searchQuery = "bancolombia OR nequi OR davivienda OR transferencia OR compra OR retiro OR pago";

  const params = new URLSearchParams({
    $search: `"${searchQuery}"`,
    $filter: `receivedDateTime ge ${since}`,
    $top: String(Math.min(maxResults * 3, 100)), // Fetch more since we filter after
    $orderby: "receivedDateTime desc",
    $select: "id,from,subject,receivedDateTime,body,bodyPreview",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Graph API error:", res.status, text);

    // Fallback: try without $search, just get recent emails
    return fetchRecentEmails(accessToken, since, maxResults);
  }

  const data = await res.json();
  if (!data.value || data.value.length === 0) {
    return fetchRecentEmails(accessToken, since, maxResults);
  }

  return filterAndMap(data.value, maxResults);
}

/**
 * Fallback: fetch recent emails without search, filter by sender in code.
 */
async function fetchRecentEmails(
  accessToken: string,
  since: string,
  maxResults: number
): Promise<FetchedEmail[]> {
  const params = new URLSearchParams({
    $filter: `receivedDateTime ge ${since}`,
    $top: String(Math.min(maxResults * 5, 200)),
    $orderby: "receivedDateTime desc",
    $select: "id,from,subject,receivedDateTime,body,bodyPreview",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    }
  );

  if (!res.ok) {
    console.error("Graph fallback error:", res.status);
    return [];
  }

  const data = await res.json();
  if (!data.value) return [];

  return filterAndMap(data.value, maxResults);
}

function filterAndMap(
  messages: {
    id: string;
    from: { emailAddress: { address: string } };
    subject: string;
    receivedDateTime: string;
    body: { content: string; contentType: string };
    bodyPreview: string;
  }[],
  maxResults: number
): FetchedEmail[] {
  const senderLower = FINANCIAL_SENDERS.map((s) => s.toLowerCase());

  const filtered = messages.filter((msg) => {
    const from = msg.from?.emailAddress?.address?.toLowerCase() ?? "";
    return senderLower.some((s) => from.includes(s));
  });

  return filtered.slice(0, maxResults).map((msg) => {
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
  });
}
