import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Return null if OpenAI API key is not configured
  if (!openai || !process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured. Embeddings will not be generated.');
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error: any) {
    // Log error but don't throw - allow nodes to be created without embeddings
    console.error('Error generating embedding:', error.message || error);
    console.warn('Continuing without embedding. Node will be created without vector embedding.');
    return null;
  }
}

