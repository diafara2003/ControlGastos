interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletion {
  choices: { message: { content: string } }[];
}

/**
 * Call Azure OpenAI Chat Completions API.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o-mini";
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview";

  if (!endpoint || !apiKey) {
    throw new Error("Azure OpenAI not configured");
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${text}`);
  }

  const data: ChatCompletion = await res.json();
  return data.choices[0]?.message?.content ?? "";
}
