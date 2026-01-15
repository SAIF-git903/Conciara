import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Support both OpenAI and OpenRouter
const useOpenRouter = process.env.USE_OPENROUTER === 'true';
const apiKey = useOpenRouter 
  ? process.env.OPENROUTER_API_KEY 
  : process.env.OPENAI_API_KEY;

const openai = apiKey
  ? new OpenAI({
      apiKey: apiKey,
      baseURL: useOpenRouter 
        ? 'https://openrouter.ai/api/v1' 
        : undefined, // Use default OpenAI base URL
    })
  : null;

export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Return null if API key is not configured
  if (!openai || !apiKey) {
    const provider = useOpenRouter ? 'OpenRouter' : 'OpenAI';
    console.warn(`${provider} API key not configured. Embeddings will not be generated.`);
    return null;
  }

  try {
    // OpenRouter uses OpenAI-compatible model names
    const model = useOpenRouter 
      ? 'openai/text-embedding-ada-002'  // OpenAI model via OpenRouter
      : 'text-embedding-ada-002';         // Direct OpenAI
    
    const response = await openai.embeddings.create({
      model: model,
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error: any) {
    // Log error but don't throw - allow nodes to be created without embeddings
    const provider = useOpenRouter ? 'OpenRouter' : 'OpenAI';
    console.error(`Error generating embedding (${provider}):`, error.message || error);
    console.warn('Continuing without embedding. Node will be created without vector embedding.');
    return null;
  }
}

