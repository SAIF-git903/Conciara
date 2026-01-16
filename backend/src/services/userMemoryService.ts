import { pool } from '../db/connection.js';
import { generateEmbedding } from './embeddingService.js';

export type MemoryType = 'profile' | 'preference' | 'constraint' | 'conversation' | 'fact' | 'knowledge';

export interface UserMemory {
  id: number;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  metadata: Record<string, any>;
  vector_embedding: number[] | null;
  relevance_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: number;
  user_id: string;
  name: string | null;
  email: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Check if vector extension is available (cached)
let hasVectorExtension: boolean | null = null;

async function checkVectorExtension(): Promise<boolean> {
  if (hasVectorExtension !== null) {
    return hasVectorExtension;
  }
  try {
    const result = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
    `);
    hasVectorExtension = result.rows[0]?.has_vector || false;
    return hasVectorExtension as boolean;
  } catch (error) {
    hasVectorExtension = false;
    return false;
  }
}

// Get or create user profile
export async function getOrCreateUserProfile(userId: string): Promise<UserProfile> {
  try {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Create new profile
    const insertResult = await pool.query(
      `INSERT INTO user_profiles (user_id, metadata)
       VALUES ($1, '{}'::jsonb)
       RETURNING *`,
      [userId]
    );
    
    return insertResult.rows[0];
  } catch (error: any) {
    console.error('[UserMemory] ❌ Error in getOrCreateUserProfile:', error.message);
    console.error('[UserMemory] Error details:', error);
    throw error;
  }
}

// Update user profile metadata
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; email?: string; metadata?: Record<string, any> }
): Promise<UserProfile> {
  const profile = await getOrCreateUserProfile(userId);
  
  const newMetadata = { ...profile.metadata, ...(updates.metadata || {}) };
  
  const result = await pool.query(
    `UPDATE user_profiles 
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         metadata = $3::jsonb,
         updated_at = NOW()
     WHERE user_id = $4
     RETURNING *`,
    [updates.name || null, updates.email || null, JSON.stringify(newMetadata), userId]
  );
  
  return result.rows[0];
}

// Store user memory
export async function storeUserMemory(
  userId: string,
  memoryType: MemoryType,
  content: string,
  metadata: Record<string, any> = {},
  relevanceScore: number = 1.0
): Promise<UserMemory> {
  const hasVector = await checkVectorExtension();
  
  // Generate embedding for the content
  let embedding: number[] | null = null;
  let embeddingValue: string | null = null;
  
  if (hasVector) {
    embedding = await generateEmbedding(content);
    if (embedding) {
      embeddingValue = `[${embedding.join(',')}]`;
    }
  }
  
  try {
    const result = await pool.query(
      hasVector && embeddingValue
        ? `INSERT INTO user_memory (user_id, memory_type, content, metadata, vector_embedding, relevance_score)
           VALUES ($1, $2, $3, $4::jsonb, $5::vector, $6)
           RETURNING *`
        : `INSERT INTO user_memory (user_id, memory_type, content, metadata, relevance_score)
           VALUES ($1, $2, $3, $4::jsonb, $5)
           RETURNING *`,
      hasVector && embeddingValue
        ? [userId, memoryType, content, JSON.stringify(metadata), embeddingValue, relevanceScore]
        : [userId, memoryType, content, JSON.stringify(metadata), relevanceScore]
    );
      content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
    });
    
    return result.rows[0];
  } catch (error: any) {
    console.error('[UserMemory] ❌ Error storing memory:', error.message);
    throw error;
  }
}

// Retrieve relevant user memories using semantic search
export async function retrieveUserMemories(
  userId: string,
  query: string,
  memoryTypes?: MemoryType[],
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<UserMemory[]> {
  const hasVector = await checkVectorExtension();
  
  if (!hasVector) {
    // Fallback to keyword search if vector extension not available
    let sqlQuery: string;
    let params: any[];
    
    if (memoryTypes && memoryTypes.length > 0) {
      sqlQuery = `SELECT * FROM user_memory 
       WHERE user_id = $1 
       AND memory_type = ANY($2::varchar[])
       ORDER BY relevance_score DESC, created_at DESC
       LIMIT $3`;
      params = [userId, memoryTypes, limit];
    } else {
      sqlQuery = `SELECT * FROM user_memory 
       WHERE user_id = $1 
       ORDER BY relevance_score DESC, created_at DESC
       LIMIT $2`;
      params = [userId, limit];
    }
    
    const result = await pool.query(sqlQuery, params);
    return result.rows;
  }
  
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    // Fallback to keyword search
    let sqlQuery: string;
    let params: any[];
    
    if (memoryTypes && memoryTypes.length > 0) {
      sqlQuery = `SELECT * FROM user_memory 
       WHERE user_id = $1 
       AND memory_type = ANY($2::varchar[])
       ORDER BY relevance_score DESC, created_at DESC
       LIMIT $3`;
      params = [userId, memoryTypes, limit];
    } else {
      sqlQuery = `SELECT * FROM user_memory 
       WHERE user_id = $1 
       ORDER BY relevance_score DESC, created_at DESC
       LIMIT $2`;
      params = [userId, limit];
    }
    
    const result = await pool.query(sqlQuery, params);
    return result.rows;
  }
  
  const embeddingValue = `[${queryEmbedding.join(',')}]`;
  
  // Build query with consistent parameter positions
  let sqlQuery: string;
  let params: any[];
  
  if (memoryTypes && memoryTypes.length > 0) {
    sqlQuery = `SELECT *, 
      (1 - (vector_embedding <=> $2::vector)) as similarity
     FROM user_memory 
     WHERE user_id = $1 
       AND vector_embedding IS NOT NULL
       AND memory_type = ANY($3::varchar[])
       AND (1 - (vector_embedding <=> $2::vector)) >= $4
     ORDER BY similarity DESC, relevance_score DESC
     LIMIT $5`;
    params = [userId, embeddingValue, memoryTypes, similarityThreshold, limit];
  } else {
    sqlQuery = `SELECT *, 
      (1 - (vector_embedding <=> $2::vector)) as similarity
     FROM user_memory 
     WHERE user_id = $1 
       AND vector_embedding IS NOT NULL
       AND (1 - (vector_embedding <=> $2::vector)) >= $3
     ORDER BY similarity DESC, relevance_score DESC
     LIMIT $4`;
    params = [userId, embeddingValue, similarityThreshold, limit];
  }
  
  const result = await pool.query(sqlQuery, params);
  
  return result.rows;
}

// Get all memories for a user (for context building)
export async function getUserMemories(
  userId: string,
  memoryTypes?: MemoryType[]
): Promise<UserMemory[]> {
  const typeFilter = memoryTypes && memoryTypes.length > 0
    ? `WHERE user_id = $1 AND memory_type = ANY($2::varchar[])`
    : `WHERE user_id = $1`;
  
  const result = await pool.query(
    `SELECT * FROM user_memory 
     ${typeFilter}
     ORDER BY relevance_score DESC, created_at DESC`,
    memoryTypes && memoryTypes.length > 0
      ? [userId, memoryTypes]
      : [userId]
  );
  
  return result.rows;
}

// Extract user information from conversation message
export async function extractAndStoreUserInfo(
  userId: string,
  userMessage: string,
  botResponse?: string
): Promise<void> {
  const message = userMessage.toLowerCase();
  
  // Extract profile information
  const profileInfo: Record<string, any> = {};
  
  // Check for profession/role mentions
  if (message.includes('react') || message.includes('programmer') || message.includes('developer')) {
    profileInfo.profession = 'programmer';
    profileInfo.technologies = profileInfo.technologies || [];
    if (message.includes('react')) profileInfo.technologies.push('react');
    if (message.includes('mobile')) profileInfo.technologies.push('mobile');
    
    await storeUserMemory(
      userId,
      'profile',
      'User is a React programmer and mobile developer',
      { profession: 'programmer', technologies: profileInfo.technologies },
      1.0
    );
  }
  
  if (message.includes('gamer') || message.includes('gaming') || message.includes('fortnite') || message.includes('call of duty')) {
    profileInfo.interests = profileInfo.interests || [];
    profileInfo.interests.push('gaming');
    
    await storeUserMemory(
      userId,
      'profile',
      'User is interested in gaming',
      { interests: profileInfo.interests },
      1.0
    );
  }
  
  if (message.includes('accountant') || message.includes('accounting')) {
    profileInfo.profession = 'accountant';
    
    await storeUserMemory(
      userId,
      'profile',
      'User works as an accountant',
      { profession: 'accountant' },
      1.0
    );
  }
  
  // Extract constraints
  if (message.includes('budget') || message.includes('cheap') || message.includes('affordable') || message.includes('used')) {
    await storeUserMemory(
      userId,
      'constraint',
      'User has budget constraints and prefers affordable or used options',
      { budget: 'limited', preference: 'affordable' },
      1.0
    );
  }
  
  if (message.includes('africa') || message.includes('pakistan')) {
    await storeUserMemory(
      userId,
      'constraint',
      `User is located in ${message.includes('africa') ? 'Africa' : 'Pakistan'}`,
      { location: message.includes('africa') ? 'Africa' : 'Pakistan' },
      1.0
    );
  }
  
  // Extract preferences
  if (message.includes('mac') || message.includes('macbook') || message.includes('apple')) {
    await storeUserMemory(
      userId,
      'preference',
      'User prefers Mac/Apple products',
      { brand: 'Apple', product_type: 'laptop' },
      1.0
    );
  }
  
  if (message.includes('windows') || message.includes('pc') || message.includes('laptop') && !message.includes('mac')) {
    await storeUserMemory(
      userId,
      'preference',
      'User is open to Windows/PC laptops',
      { brand: 'Windows', product_type: 'laptop' },
      1.0
    );
  }
  
  // Extract specific requirements
  const ramMatch = message.match(/(\d+)\s*(gig|gb|gigs?)\s*(ram|memory)/i);
  if (ramMatch) {
    await storeUserMemory(
      userId,
      'preference',
      `User needs ${ramMatch[1]}GB RAM`,
      { ram: parseInt(ramMatch[1]), unit: 'GB' },
      1.0
    );
  }
  
  const screenMatch = message.match(/(\d+)\s*(inch|in)\s*(screen|monitor|display)/i);
  if (screenMatch) {
    await storeUserMemory(
      userId,
      'preference',
      `User prefers ${screenMatch[1]}-inch screen`,
      { screen_size: parseInt(screenMatch[1]), unit: 'inches' },
      1.0
    );
  }
  
  const chipMatch = message.match(/(m\d+|intel|amd|ryzen|i\d+)/i);
  if (chipMatch) {
    await storeUserMemory(
      userId,
      'preference',
      `User mentioned ${chipMatch[1]} processor`,
      { processor: chipMatch[1] },
      1.0
    );
  }
  
  // Store conversation context (always store, even if no keywords matched)
  // This ensures we have conversation history
  if (botResponse) {
    await storeUserMemory(
      userId,
      'conversation',
      `User said: "${userMessage}". Bot responded: "${botResponse}"`,
      { timestamp: new Date().toISOString() },
      0.8
    );
  } else {
    // Store user message even without bot response (for context)
    // Only store if message is meaningful (not just greetings)
    const meaningfulMessage = userMessage.trim().length > 3 && 
      !['hi', 'hello', 'hey', 'start', '__start__'].includes(message.trim());
    
    if (meaningfulMessage) {
      await storeUserMemory(
        userId,
        'conversation',
        `User said: "${userMessage}"`,
        { timestamp: new Date().toISOString() },
        0.7
      );
    }
  }
}

// Build context string from user memories
export async function buildUserContext(userId: string): Promise<string> {
  const memories = await getUserMemories(userId);
  
  if (memories.length === 0) {
    return '';
  }
  
  // Group by type
  const byType: Record<MemoryType, UserMemory[]> = {
    profile: [],
    preference: [],
    constraint: [],
    conversation: [],
    fact: [],
    knowledge: []
  };
  
  memories.forEach(memory => {
    byType[memory.memory_type].push(memory);
  });
  
  const contextParts: string[] = [];
  
  // Profile information
  if (byType.profile.length > 0) {
    const profileFacts = byType.profile.map(m => m.content).join('. ');
    contextParts.push(`User Profile: ${profileFacts}`);
  }
  
  // Preferences
  if (byType.preference.length > 0) {
    const preferences = byType.preference.map(m => m.content).join('. ');
    contextParts.push(`Preferences: ${preferences}`);
  }
  
  // Constraints
  if (byType.constraint.length > 0) {
    const constraints = byType.constraint.map(m => m.content).join('. ');
    contextParts.push(`Constraints: ${constraints}`);
  }
  
  return contextParts.join('\n');
}

