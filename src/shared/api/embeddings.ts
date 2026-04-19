/**
 * Generate text embeddings using Azure OpenAI Embeddings API.
 * Uses text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview";

  if (!endpoint || !apiKey) {
    throw new Error("Azure OpenAI not configured");
  }

  // Use embeddings deployment (or fall back to a default name)
  const deployment =
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-small";

  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.data[0].embedding as number[];
}
