import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Use only OpenAI API
const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey
  ? new OpenAI({
      apiKey: apiKey,
    })
  : null;

export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Return null if API key is not configured
  if (!openai || !apiKey) {
    console.warn(`[EmbeddingService] API key not configured. Embeddings will not be generated.`);
    return null;
  }

  try {
    const model = 'text-embedding-ada-002';         // Direct OpenAI

    const response = await openai.embeddings.create({
      model: model,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    // Log error but don't throw - allow nodes to be created without embeddings
    console.error('[EmbeddingService] Error generating embedding (OpenAI):', error.message || error);
    return null;
  }
}
