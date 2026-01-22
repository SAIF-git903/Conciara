import { pool } from '../db/connection.js';
import { getNodesByTreeId, getNodeById, DialogNode, getPrepromptByTreeId } from './dialogService.js';
import { generateEmbedding } from './embeddingService.js';
import {
  getOrCreateUserProfile,
  extractAndStoreUserInfo,
  buildUserContext,
  retrieveUserMemories,
  getUserMemories
} from './userMemoryService.js';
import {
  generateContextualResponse,
  generateHybridResponse,
  LLMError,
  isLLMLimitError,
  isLLMAuthError,
  hasLLMCredits
} from './llmService.js';
import { traceService, Trace } from './traceService.js';

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

export interface ChatSession {
  session_id: string;
  tree_id: number;
  current_node_id: number | null;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  bot_response: string;
  next_node_id: number | null;
  session_id: string;
  options?: string[]; // Quick reply options
  trace_id?: string; // Trace ID for observability
}

// Generate unique session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create session
export async function getOrCreateSession(
  sessionId: string | null,
  treeId: number,
  userId?: string | null
): Promise<ChatSession> {
  if (sessionId) {
    const result = await pool.query(
      'SELECT * FROM conversation_sessions WHERE session_id = $1',
      [sessionId]
    );
    if (result.rows.length > 0) {
      // Update user_id if provided and not set
      if (userId && !result.rows[0].user_id) {
        await pool.query(
          'UPDATE conversation_sessions SET user_id = $1 WHERE session_id = $2',
          [userId, sessionId]
        );
        result.rows[0].user_id = userId;
      }
      return result.rows[0];
    }
  }

  // Create new session
  const newSessionId = sessionId || generateSessionId();
  const result = await pool.query(
    `INSERT INTO conversation_sessions (session_id, tree_id, current_node_id, user_id)
     VALUES ($1, $2, NULL, $3) RETURNING *`,
    [newSessionId, treeId, userId || null]
  );
  return result.rows[0];
}

// Update session current node
export async function updateSessionNode(
  sessionId: string,
  nodeId: number | null
): Promise<void> {
  await pool.query(
    'UPDATE conversation_sessions SET current_node_id = $1, updated_at = NOW() WHERE session_id = $2',
    [nodeId, sessionId]
  );
}

// Log conversation message
export async function logConversation(
  sessionId: string,
  treeId: number,
  nodeId: number | null,
  userMessage: string | null,
  botResponse: string
): Promise<void> {
  await pool.query(
    `INSERT INTO conversation_history (session_id, tree_id, node_id, user_message, bot_response)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, treeId, nodeId, userMessage, botResponse]
  );
}

// Get root node (node with no parent)
function getRootNode(nodes: DialogNode[]): DialogNode | null {
  return nodes.find(node => node.parent_id === null) || null;
}

// Find most similar node using vector embeddings (semantic matching)
async function findSimilarNodeByEmbedding(
  userEmbedding: number[],
  parentId: number | null,
  treeId: number,
  similarityThreshold: number = 0.7,
  traceId?: string
): Promise<{ node: DialogNode; similarity: number } | null> {
  const hasVector = await checkVectorExtension();
  
  if (!hasVector) {
    if (traceId) {
      traceService.addEvent(traceId, 'vector_db_search', {
        status: 'skipped',
        reason: 'pgvector extension not available',
        queryEmbedding: userEmbedding.slice(0, 5), // First 5 dimensions for preview
        embeddingDimensions: userEmbedding.length,
      });
    }
    return null; // pgvector not available
  }

  try {
    // Format embedding as PostgreSQL vector
    const embeddingString = `[${userEmbedding.join(',')}]`;
    
    if (traceId) {
      traceService.addEvent(traceId, 'vector_db_search', {
        status: 'started',
        queryEmbedding: userEmbedding.slice(0, 5), // First 5 dimensions for preview
        embeddingDimensions: userEmbedding.length,
        parentId,
        treeId,
        similarityThreshold,
        vectorStore: 'PostgreSQL pgvector',
      });
    }
    
    // Query for nodes with similar embeddings using cosine distance (<=>)
    // Cosine distance: 0 = identical, 1 = orthogonal, 2 = opposite
    // We convert to similarity: similarity = 1 - (distance / 2)
    // Threshold of 0.7 similarity means distance < 0.6
    let query: string;
    let params: any[];

    if (parentId === null) {
      // Root nodes (parent_id IS NULL)
      query = `
        SELECT 
          id,
          tree_id,
          parent_id,
          user_input,
          bot_response,
          vector_embedding,
          created_at,
          updated_at,
          1 - (vector_embedding <=> $1::vector) / 2 as similarity
        FROM dialog_nodes
        WHERE tree_id = $2
          AND parent_id IS NULL
          AND vector_embedding IS NOT NULL
          AND (1 - (vector_embedding <=> $1::vector) / 2) >= $3
        ORDER BY vector_embedding <=> $1::vector
        LIMIT 1
      `;
      params = [embeddingString, treeId, similarityThreshold];
    } else {
      // Child nodes (parent_id = specific value)
      query = `
        SELECT 
          id,
          tree_id,
          parent_id,
          user_input,
          bot_response,
          vector_embedding,
          created_at,
          updated_at,
          1 - (vector_embedding <=> $1::vector) / 2 as similarity
        FROM dialog_nodes
        WHERE tree_id = $2
          AND parent_id = $3
          AND vector_embedding IS NOT NULL
          AND (1 - (vector_embedding <=> $1::vector) / 2) >= $4
        ORDER BY vector_embedding <=> $1::vector
        LIMIT 1
      `;
      params = [embeddingString, treeId, parentId, similarityThreshold];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      if (traceId) {
        traceService.addEvent(traceId, 'vector_db_search', {
          status: 'completed',
          resultsFound: 0,
          reason: 'No nodes found above similarity threshold',
        });
      }
      return null; // No similar node found above threshold
    }

    const row = result.rows[0];
    const similarity = parseFloat(row.similarity);
    
    if (traceId) {
      traceService.addEvent(traceId, 'vector_db_search', {
        status: 'completed',
        resultsFound: 1,
        topResult: {
          nodeId: row.id,
          userInput: row.user_input,
          similarity,
          similarityThreshold,
        },
        queryStrategy: parentId === null ? 'root_nodes' : 'child_nodes',
      });
    }
    
    return {
      node: {
        id: row.id,
        tree_id: row.tree_id,
        parent_id: row.parent_id,
        user_input: row.user_input,
        bot_response: row.bot_response,
        vector_embedding: row.vector_embedding,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      similarity,
    };
  } catch (error: any) {
    console.error('Error in semantic similarity search:', error.message);
    if (traceId) {
      traceService.addEvent(traceId, 'vector_db_search', {
        status: 'error',
        error: error.message,
      });
    }
    return null; // Fallback to other strategies
  }
}

// Find matching node based on user input
async function findMatchingNode(
  userMessage: string,
  currentNode: DialogNode | null,
  allNodes: DialogNode[],
  traceId?: string
): Promise<DialogNode | null> {
  if (!currentNode) {
    // Starting conversation - return root node
    const rootNode = getRootNode(allNodes);
    if (traceId && rootNode) {
      traceService.addEvent(traceId, 'dialog_tree_search', {
        status: 'root_node',
        nodeId: rootNode.id,
        userInput: rootNode.user_input,
      });
    }
    return rootNode;
  }

  if (traceId) {
    traceService.addEvent(traceId, 'dialog_tree_search', {
      status: 'started',
      current_node_id: currentNode.id,
      userMessage,
      searchScope: 'children_and_siblings',
    });
  }

  const userMessageLower = userMessage.toLowerCase().trim();
  
  // Product keywords that indicate user wants to change selection
  const productKeywords = new Set(['laptop', 'computer', 'smartphone', 'phone', 'tablet', 'watch', 
    'headphone', 'speaker', 'camera', 'tv', 'monitor', 'keyboard', 'mouse', 'printer', 'scanner']);
  
  // Check if user mentions a product keyword (might want to change selection)
  const userMessageWords = userMessageLower.split(/\s+/);
  const mentionedProducts = userMessageWords.filter(word => productKeywords.has(word));
  
  // Get child nodes of current node (primary search)
  let childNodes = allNodes.filter(node => node.parent_id === currentNode.id);
  
  // If user mentions a product and no match in children, also check siblings (same parent)
  // This allows "actually i'm looking for a laptop" to work when at smartphone node
  let nodesToSearch = childNodes;
  if (mentionedProducts.length > 0 && currentNode.parent_id !== null) {
    const siblingNodes = allNodes.filter(node => 
      node.parent_id === currentNode.parent_id && node.id !== currentNode.id
    );
    // Combine children and siblings for search
    nodesToSearch = [...childNodes, ...siblingNodes];
  }
  
  // If still no match and user mentions product, check parent's siblings (go up one level)
  // This allows deeper backtracking
  if (mentionedProducts.length > 0 && currentNode.parent_id !== null) {
    const parentNode = allNodes.find(node => node.id === currentNode.parent_id);
    if (parentNode && parentNode.parent_id !== null) {
      const parentSiblingNodes = allNodes.filter(node => 
        node.parent_id === parentNode.parent_id && node.id !== parentNode.id
      );
      nodesToSearch = [...nodesToSearch, ...parentSiblingNodes];
    }
  }

  if (nodesToSearch.length === 0) {
    return null; // No nodes to search
  }

  // Common greetings that shouldn't match to product nodes
  const genericGreetings = new Set(['hi', 'hello', 'hey', 'hi there', 'hello there', 
    'hey there', 'good morning', 'good afternoon', 'good evening', 'greetings', 
    'howdy', 'whats up', 'what\'s up', 'sup', 'yo']);
  const isGenericGreeting = genericGreetings.has(userMessageLower) || 
    (userMessageLower.split(/\s+/).length <= 2 && userMessageLower.split(/\s+/).every(word => 
      genericGreetings.has(word) || ['there', 'the', 'a', 'an'].includes(word)));

  // CRITICAL: Check for generic greetings FIRST - before any matching
  // This prevents "hi there" from matching to product nodes via semantic matching
  if (isGenericGreeting) {
    return null; // Return null immediately to trigger "I'm not sure" response
  }

  // Strategy 1: Exact match on user_input (search in nodesToSearch to include siblings)
  const exactMatch = nodesToSearch.find(node => {
    if (!node.user_input) return false;
    return node.user_input.toLowerCase().trim() === userMessageLower;
  });
  if (exactMatch) {
    if (traceId) {
      traceService.addEvent(traceId, 'dialog_tree_search', {
        status: 'completed',
        strategy: 'exact_match',
        matchedNodeId: exactMatch.id,
        matchedUserInput: exactMatch.user_input,
      });
    }
    return exactMatch;
  }

  // Strategy 2: Partial match (contains) - but skip generic greetings (already checked above)
  if (userMessageLower.length >= 5) {
    // Only do partial match if message is meaningful
    const partialMatch = nodesToSearch.find(node => {
      if (!node.user_input) return false;
      const nodeInputLower = node.user_input.toLowerCase();
      // Require at least 3 characters overlap for partial match
      if (userMessageLower.length < 3 || nodeInputLower.length < 3) return false;
      return nodeInputLower.includes(userMessageLower) || userMessageLower.includes(nodeInputLower);
    });
    if (partialMatch) {
      if (traceId) {
        traceService.addEvent(traceId, 'dialog_tree_search', {
          status: 'completed',
          strategy: 'partial_match',
          matchedNodeId: partialMatch.id,
          matchedUserInput: partialMatch.user_input,
        });
      }
      return partialMatch;
    }
  }

  // Strategy 3: Semantic matching using embeddings (if available) - MOVED BEFORE keyword matching
  // This ensures semantic understanding takes priority over simple word matching
  // BUT we validate product keywords to avoid mismatches (e.g., smartphone vs laptop)
  
  // Extract product keywords from user input (productKeywords already defined above)
  const userProductKeywords = mentionedProducts; // Already extracted above
  
  try {
    if (traceId) {
      traceService.addEvent(traceId, 'tokenization', {
        status: 'started',
        input: userMessage,
        method: 'embedding_generation',
      });
    }
    
    const userEmbedding = await generateEmbedding(userMessage);
    
    if (traceId) {
      traceService.addEvent(traceId, 'tokenization', {
        status: 'completed',
        embeddingGenerated: !!userEmbedding,
        embeddingDimensions: userEmbedding?.length || 0,
        embeddingPreview: userEmbedding?.slice(0, 5) || [],
      });
    }
    
    if (userEmbedding) {
      // Find node with most similar embedding using pgvector similarity search
      const currentNodeId = currentNode?.id || null;
      const treeId = currentNode?.tree_id || allNodes[0]?.tree_id;
      
      if (treeId) {
        // If user mentions a product, search in siblings too (not just children)
        // This allows "actually i'm looking for a laptop" to work when at smartphone node
        let searchParentId = currentNodeId;
        if (userProductKeywords.length > 0 && currentNode && currentNode.parent_id !== null) {
          // Search in siblings (same parent) instead of just children
          searchParentId = currentNode.parent_id;
        }
        
        // Try with lower threshold first (55%), then fallback to even lower (45%)
        let similarNodeResult = await findSimilarNodeByEmbedding(
          userEmbedding,
          searchParentId, // Use parent_id to search siblings when product mentioned
          treeId,
          0.55, // Lower threshold to catch more semantic matches
          traceId
        );
        
        if (!similarNodeResult) {
          // Try with even lower threshold as fallback
          if (traceId) {
            traceService.addEvent(traceId, 'backtracking', {
              status: 'retry',
              reason: 'No match found at 0.55 threshold, trying 0.45',
              threshold: 0.45,
            });
          }
          similarNodeResult = await findSimilarNodeByEmbedding(
            userEmbedding,
            searchParentId,
            treeId,
            0.45,
            traceId
          );
        }
        
        if (similarNodeResult) {
          const similarity = similarNodeResult.similarity || 0;
          
          if (similarity >= 0.45) {
            // CRITICAL: Reject semantic matches for generic greetings (even if similarity is high)
            // Generic greetings shouldn't match to product nodes via semantic matching
            const matchedNodeInput = similarNodeResult.node.user_input?.toLowerCase() || '';
            const matchedNodeLower = matchedNodeInput.toLowerCase();
            
            // Check if matched node contains product keywords - if not, it might be a generic match
            const matchedNodeProducts = matchedNodeInput.split(/\s+/).filter(word => productKeywords.has(word));
            const hasProductInMatch = matchedNodeProducts.length > 0;
            
            // If user has product keywords, validate match also has them
            if (userProductKeywords.length > 0) {
              const hasMatchingProduct = userProductKeywords.some(userProduct => 
                matchedNodeProducts.includes(userProduct)
              );
              
              if (!hasMatchingProduct) {
                // Reject semantic match and fall through to keyword matching
              } else {
                return similarNodeResult.node;
              }
            } else if (hasProductInMatch) {
              // User has no product keywords but match has products - reject (user probably said something generic)
              // Reject and fall through to keyword matching
            } else {
              // No product keywords in either - accept semantic match (both are generic)
              if (traceId) {
                traceService.addEvent(traceId, 'dialog_tree_search', {
                  status: 'completed',
                  strategy: 'semantic_match',
                  matchedNodeId: similarNodeResult.node.id,
                  matchedUserInput: similarNodeResult.node.user_input,
                  similarity: similarNodeResult.similarity,
                });
              }
              return similarNodeResult.node;
            }
          }
        }
      }
    }
  } catch (error: any) {
    // Embeddings not available or error occurred, continue to keyword matching
    console.warn('Semantic matching unavailable:', error.message);
    if (traceId) {
      traceService.addEvent(traceId, 'dialog_tree_search', {
        status: 'fallback',
        strategy: 'semantic_match_failed',
        error: error.message,
        fallbackTo: 'keyword_matching',
      });
    }
  }

  // Strategy 4: Improved keyword matching (with stop word filtering and distinctive word weighting)
  // Common stop words that don't carry semantic meaning
  // Note: Action words like 'need', 'looking', 'want' are kept as they carry semantic meaning
  const stopWords = new Set(['i', 'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 
    'must', 'can', 'this', 'that', 'these', 'those', 'am', 'for', 'to', 'of', 'in', 'on', 'at', 
    'by', 'with', 'from', 'as', 'or', 'and', 'but', 'if', 'then', 'so', 'up', 'down', 'out', 'off', 
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 
    'how', 'all', 'each', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 
    'should', 'now', 
    // Filler words that don't change meaning
    'actually', 'really', 'well', 'um', 'uh', 'like', 'you know', 'i mean', 'sort of', 'kind of',
    'basically', 'literally', 'honestly', 'seriously', 'obviously', 'probably', 'maybe', 'perhaps']);
  
  // Normalize contractions and handle apostrophes for better matching
  const normalizedMessage = userMessageLower
    .replace(/'m\b/g, ' am')
    .replace(/'re\b/g, ' are')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/'d\b/g, ' would')
    .replace(/n't\b/g, ' not')
    .replace(/'t\b/g, ' not');
  
  // Split and clean words (remove punctuation, handle contractions)
  const userWords = normalizedMessage
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
    .filter(word => word.length > 0 && !stopWords.has(word));
  
  // If all words are stop words, use original words (fallback)
  const wordsToMatch = userWords.length > 0 ? userWords : normalizedMessage.split(/\s+/).filter(w => w.replace(/[^\w]/g, '').length > 0);
  
  // Find distinctive words (words that appear in only one option)
  // These are more valuable for matching than common words
  const allNodeWords = new Map<string, number>(); // word -> count across all nodes
  for (const node of nodesToSearch) {
    if (!node.user_input) continue;
    const nodeInputLower = node.user_input.toLowerCase();
    const normalizedNodeInput = nodeInputLower
      .replace(/'m\b/g, ' am')
      .replace(/'re\b/g, ' are')
      .replace(/'ve\b/g, ' have')
      .replace(/'ll\b/g, ' will')
      .replace(/'d\b/g, ' would')
      .replace(/n't\b/g, ' not')
      .replace(/'t\b/g, ' not');
    const nodeWords = normalizedNodeInput
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 0 && !stopWords.has(word));
    for (const word of nodeWords) {
      allNodeWords.set(word, (allNodeWords.get(word) || 0) + 1);
    }
  }
  
  // Words that appear in only one option are distinctive
  const distinctiveWords = new Set(
    Array.from(allNodeWords.entries())
      .filter(([_, count]) => count === 1)
      .map(([word, _]) => word)
  );
  
  // Identify product/object words (nouns that are likely the main topic)
  // These should be prioritized even more than other distinctive words
  // Note: productKeywords already defined above for semantic matching validation
  
  let bestMatch: DialogNode | null = null;
  let bestScore = 0;
  let bestMatchHasProductOrDistinctive = false; // Track if best match has product/distinctive words

  for (const node of childNodes) {
    if (!node.user_input) continue;
    
    // Normalize node input the same way as user input
    const nodeInputLower = node.user_input.toLowerCase();
    const normalizedNodeInput = nodeInputLower
      .replace(/'m\b/g, ' am')
      .replace(/'re\b/g, ' are')
      .replace(/'ve\b/g, ' have')
      .replace(/'ll\b/g, ' will')
      .replace(/'d\b/g, ' would')
      .replace(/n't\b/g, ' not')
      .replace(/'t\b/g, ' not');
    
    const nodeWords = normalizedNodeInput
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
      .filter(word => word.length > 0 && !stopWords.has(word));
    const nodeWordsToMatch = nodeWords.length > 0 ? nodeWords : normalizedNodeInput.split(/\s+/).filter(w => w.replace(/[^\w]/g, '').length > 0);
    
    // Count matching important words with priority for exact matches and distinctive words
    let exactProductMatches = 0;      // Exact match on product keyword (highest priority)
    let exactDistinctiveMatches = 0;  // Exact match on distinctive word
    let exactCommonMatches = 0;       // Exact match on common word
    let partialMatches = 0;           // Partial match
    
    for (const word of wordsToMatch) {
      const exactMatch = nodeWordsToMatch.some(nodeWord => nodeWord === word);
      const partialMatch = !exactMatch && nodeWordsToMatch.some(nodeWord => 
        nodeWord.includes(word) || word.includes(nodeWord)
      );
      const isDistinctive = distinctiveWords.has(word);
      const isProduct = productKeywords.has(word);
      
      if (exactMatch) {
        if (isProduct) {
          exactProductMatches++; // Product words get highest priority
        } else if (isDistinctive) {
          exactDistinctiveMatches++;
        } else {
          exactCommonMatches++;
        }
      } else if (partialMatch) {
        partialMatches++;
      }
    }
    
    // Weight product matches extremely heavily (50x), distinctive (10x), common (1x), partial (0.1x)
    // This ensures "laptop" (product) beats "need" (common action word) decisively
    // Example: "laptop" match = 50 points, "need" match = 1 point
    // Use nodeWordsToMatch.length as denominator to avoid penalizing extra user words
    // This way "actually i'm looking for a laptop" scores the same as "i'm looking for a laptop"
    const weightedScore = (exactProductMatches * 50 + exactDistinctiveMatches * 10 + 
      exactCommonMatches * 1 + partialMatches * 0.1) / 
      Math.max(nodeWordsToMatch.length, 1); // Use node length, not user length
    
    // Lower threshold to 15% for keyword matching to catch more legitimate matches
    // But require at least one product or distinctive word match (not just common words)
    const hasProductOrDistinctiveMatch = exactProductMatches > 0 || exactDistinctiveMatches > 0;
    const minThreshold = hasProductOrDistinctiveMatch ? 0.15 : 0.3; // Lower threshold if product/distinctive match
    
    if (weightedScore > bestScore && weightedScore >= minThreshold) {
      bestScore = weightedScore;
      bestMatch = node;
      bestMatchHasProductOrDistinctive = hasProductOrDistinctiveMatch;
    }
  }

  // Only return best match if score is high enough (confidence threshold)
  // Lower threshold if we have product or distinctive matches
  const finalThreshold = bestMatchHasProductOrDistinctive ? 0.15 : 0.2;
  if (bestMatch && bestScore >= finalThreshold) {
    if (traceId) {
      traceService.addEvent(traceId, 'dialog_tree_search', {
        status: 'completed',
        strategy: 'keyword_match',
        matchedNodeId: bestMatch.id,
        matchedUserInput: bestMatch.user_input,
        score: bestScore,
        threshold: finalThreshold,
      });
    }
    return bestMatch;
  }

  // Strategy 5: If no good match found, return null
  // This triggers the fallback "I'm not sure" response instead of matching to random node
  if (traceId) {
    traceService.addEvent(traceId, 'dialog_tree_search', {
      status: 'no_match',
      reason: 'No match found above confidence threshold',
      bestScore,
      threshold: finalThreshold,
    });
  }
  return null;
}

// Process chat message with user memory support
export async function processChatMessage(
  treeId: number,
  userMessage: string,
  sessionId: string | null,
  userId?: string | null,
  useMemory: boolean = true, // Enable memory by default
  enableTracing: boolean = true // Enable tracing by default
): Promise<ChatMessage> {
  // Create trace for this conversation
  const session = await getOrCreateSession(sessionId, treeId, userId);
  const trace = enableTracing
    ? traceService.createTrace(session.session_id, treeId, userMessage, userId)
    : null;
  
  if (trace) {
    traceService.addEvent(trace.traceId, 'user_input', {
      message: userMessage,
      sessionId: session.session_id,
      userId: userId || null,
      treeId,
    });
  }
  
  // Get or create user profile if userId provided
  if (userId && useMemory) {
    try {
      await getOrCreateUserProfile(userId);
    } catch (error: any) {
      console.error('[ChatService] Error creating/getting user profile:', error.message);
      // Don't throw - continue with conversation even if profile creation fails
    }
  }

  // Get all nodes for this tree
  const allNodes = await getNodesByTreeId(treeId);
  
  // Get preprompt for this tree (if configured)
  const preprompt = await getPrepromptByTreeId(treeId);
  const prepromptContent = preprompt?.content || undefined;

  // Handle initial start message
  if (userMessage === '__START__' || userMessage.trim() === '') {
    const rootNode = getRootNode(allNodes);
    let greeting = rootNode?.bot_response || "Hello! I'm ready to help you.";
    
    // Personalize greeting if user has memory
    if (userId && useMemory) {
      const userContext = await buildUserContext(userId);
      if (userContext) {
        try {
          greeting = await generateHybridResponse(
            userMessage,
            userContext,
            greeting,
            undefined, // productCatalog
            prepromptContent // preprompt
          );
        } catch (error: any) {
          // LLM failed - use original greeting from dialog tree
          if (error instanceof LLMError && error.shouldFallback) {
            console.warn('[ChatService] LLM limit exceeded during greeting. Using dialog tree greeting.');
          }
          // greeting already has the dialog tree value, so just continue
        }
      }
    }
    
    if (rootNode) {
      await updateSessionNode(session.session_id, rootNode.id);
      await logConversation(
        session.session_id,
        treeId,
        rootNode.id,
        null,
        greeting
      );

      const childNodes = allNodes.filter(node => node.parent_id === rootNode.id);
      const options = childNodes
        .filter(node => node.user_input)
        .slice(0, 3)
        .map(node => node.user_input!);

      return {
        bot_response: greeting,
        next_node_id: rootNode.id,
        session_id: session.session_id,
        options: options.length > 0 ? options : undefined,
      };
    } else {
      return {
        bot_response: greeting,
        next_node_id: null,
        session_id: session.session_id,
      };
    }
  }

  // Extract and store user information from message
  if (userId && useMemory) {
    try {
      await extractAndStoreUserInfo(userId, userMessage);
    } catch (error: any) {
      console.error('[ChatService] Error extracting user info:', error.message);
      // Don't throw - continue with conversation even if memory extraction fails
    }
  }

  // IMPORTANT: Check user history FIRST before intent detection
  // This allows the system to personalize responses based on past interactions
  // Example: "I need a laptop" + gaming history = "I need a gaming laptop"
  let userContext = '';
  let hasStrongMemoryContext = false; // Track if memory context is strong enough to override dialog tree
  if (userId && useMemory) {
    if (trace) {
      traceService.addEvent(trace.traceId, 'user_memory_retrieval', {
        status: 'started',
        userId,
        reason: 'Checking user history first for personalization',
      });
    }
    
    // Build general user context
    userContext = await buildUserContext(userId);
    
    // Retrieve relevant memories for this specific query (semantic search)
    const relevantMemories = await retrieveUserMemories(userId, userMessage, undefined, 5);
    
    if (trace) {
      traceService.addEvent(trace.traceId, 'user_memory_retrieval', {
        status: 'completed',
        memoriesFound: relevantMemories.length,
        memories: relevantMemories.map(m => ({
          id: m.id,
          type: m.memory_type,
          content: m.content.substring(0, 100), // First 100 chars
          similarity: m.similarity,
        })),
      });
    }
    
    // Combine general context with query-specific memories
    if (relevantMemories.length > 0) {
      const memoryContext = relevantMemories.map(m => m.content).join('. ');
      userContext = userContext 
        ? `${userContext}\n\nRelevant Context: ${memoryContext}` 
        : `Relevant Context: ${memoryContext}`;
      
      // Check if we have strong memory context (preferences, constraints, or high-similarity memories)
      const hasPreferences = relevantMemories.some(m => 
        m.memory_type === 'preference' || m.memory_type === 'constraint' || m.memory_type === 'profile'
      );
      const hasHighSimilarity = relevantMemories.some(m => m.similarity && m.similarity > 0.8);
      hasStrongMemoryContext = hasPreferences || hasHighSimilarity || relevantMemories.length >= 3;
      
      if (trace && hasStrongMemoryContext) {
        traceService.addEvent(trace.traceId, 'user_memory_retrieval', {
          status: 'strong_context_detected',
          reason: 'Strong memory context found - will prioritize personalized response over dialog tree',
          hasPreferences,
          hasHighSimilarity,
          memoryCount: relevantMemories.length,
        });
      }
    }
    
    // If we have user context, enhance the user message for better intent detection
    // This helps the system understand "laptop" as "gaming laptop" if user has gaming history
    if (userContext && userContext.trim()) {
      console.log(`[ChatService] ✅ User history loaded - will use for personalization${hasStrongMemoryContext ? ' (strong context - will override dialog tree)' : ''}`);
    }
  }

  // Get current node (or null if starting)
  const currentNode = session.current_node_id
    ? await getNodeById(session.current_node_id)
    : null;

  if (trace && currentNode) {
    traceService.addEvent(trace.traceId, 'intent_detection', {
      status: 'started',
      current_node_id: currentNode.id,
      current_node_input: currentNode.user_input,
      hasUserContext: !!userContext,
    });
  }

  // Find matching next node (for dialog tree fallback)
  // Note: This happens AFTER memory retrieval so we can use context if needed
  const nextNode = await findMatchingNode(
    userMessage,
    currentNode,
    allNodes,
    trace?.traceId
  );

  if (trace) {
    traceService.addEvent(trace.traceId, 'intent_detection', {
      status: 'completed',
      matchedNodeId: nextNode?.id || null,
      matchedNodeInput: nextNode?.user_input || null,
      matchedNodeResponse: nextNode?.bot_response || null,
      usedUserContext: !!userContext,
    });
  }

  // asd/
  let botResponse: string;
  let finalNodeId: number | null = null;
  let useLLMResponse = false; // Track if we used LLM (to determine if we should show options)

  // Check if LLM/credits are available
  // This checks if API key is configured (credits available)
  const hasCredits = hasLLMCredits();
  
  console.log(`[ChatService] Decision point - Credits: ${hasCredits}, userId: ${userId || 'none'}, useMemory: ${useMemory}, userContext: ${userContext ? 'has context' : 'no context'}`);
  
  if (trace) {
    traceService.addEvent(trace.traceId, 'prompt_construction', {
      status: 'started',
      hasCredits,
      hasUserContext: !!userContext,
      hasDialogTreeResponse: !!nextNode?.bot_response,
      prepromptConfigured: !!prepromptContent,
    });
  }
  
  // CRITICAL: Use LLM if credits are available, REGARDLESS of userId
  // userId is ONLY for saving history and getting context - NOT for enabling LLM
  // Priority 1: Use LLM if credits are available (intelligent chatbot) - works with or without userId
  // Priority 2: Fallback to dialog nodes if no credits (simple bot)
  if (hasCredits) {
    console.log('[ChatService] ✅ Using intelligent LLM-powered chatbot (credits available)');
    // Generate context-aware response using LLM
    const dialogTreeResponse = nextNode?.bot_response || null;
    
    try {
      if (dialogTreeResponse) {
        // If we have strong memory context, prioritize personalized response over dialog tree
        // This means: use LLM to generate personalized response, but don't return dialog tree options
        if (hasStrongMemoryContext && userContext) {
          console.log('[ChatService] 🎯 Strong memory context detected - generating fully personalized response (skipping dialog tree options)');
          
          if (trace) {
            traceService.addEvent(trace.traceId, 'llm_call', {
              status: 'started',
              model: 'gpt-4o-mini',
              type: 'contextual_response',
              hasUserContext: true,
              reason: 'Strong memory context - using pure LLM instead of hybrid',
              skippedDialogTree: true,
            });
          }
          
          // Use pure contextual response when we have strong memory context
          // This allows the AI to directly answer based on history (e.g., "Based on your gaming interests, here are gaming laptops...")
          botResponse = await generateContextualResponse(
            userMessage,
            userContext,
            undefined, // productCatalog
            200, // Slightly longer for personalized responses
            prepromptContent
          );
          
          if (trace) {
            traceService.addEvent(trace.traceId, 'llm_call', {
              status: 'completed',
              response: botResponse.substring(0, 200),
              responseLength: botResponse.length,
              personalized: true,
            });
          }
          
          // Don't set finalNodeId - this prevents dialog tree options from being returned
          finalNodeId = session.current_node_id; // Keep current node, but don't advance
          useLLMResponse = true;
        } else {
          // Hybrid: combine dialog tree with user context (if available) or just use dialog tree + LLM
          if (trace) {
            traceService.addEvent(trace.traceId, 'llm_call', {
              status: 'started',
              model: 'gpt-4o-mini',
              type: 'hybrid_response',
              hasUserContext: !!userContext,
              dialogTreeResponse: dialogTreeResponse.substring(0, 200), // First 200 chars
            });
          }
          
          botResponse = await generateHybridResponse(
            userMessage,
            userContext || '', // Can be empty if no user-id provided
            dialogTreeResponse,
            undefined, // productCatalog
            prepromptContent // preprompt
          );
          
          if (trace) {
            traceService.addEvent(trace.traceId, 'llm_call', {
              status: 'completed',
              response: botResponse.substring(0, 200), // First 200 chars
              responseLength: botResponse.length,
            });
          }
          
          finalNodeId = nextNode?.id || null;
          useLLMResponse = true; // LLM succeeded, but we still want options from dialog tree
        }
      } else {
        // Pure LLM response (with user context if available, otherwise just LLM)
        // This works even without userId - LLM is intelligent on its own
        console.log('[ChatService] Generating pure LLM response (no dialog tree match)');
        
        if (trace) {
          traceService.addEvent(trace.traceId, 'llm_call', {
            status: 'started',
            model: 'gpt-4o-mini',
            type: 'contextual_response',
            hasUserContext: !!userContext,
          });
        }
        
        botResponse = await generateContextualResponse(
          userMessage,
          userContext || '', // Can be empty if no user-id provided - LLM still works!
          undefined, // productCatalog
          150, // maxLength
          prepromptContent // preprompt - this makes it intelligent even without user context
        );
        
        if (trace) {
          traceService.addEvent(trace.traceId, 'llm_call', {
            status: 'completed',
            response: botResponse.substring(0, 200), // First 200 chars
            responseLength: botResponse.length,
          });
        }
        
        // Don't update node if using pure LLM response
        finalNodeId = session.current_node_id;
        useLLMResponse = true; // LLM succeeded, no dialog tree match
        console.log('[ChatService] ✅ LLM response generated successfully');
      }
    } catch (error: any) {
      // Check error type and handle appropriately
      const isAuthError = error.message?.includes('authentication') || 
                         error.message?.includes('User not found') ||
                         error.status === 401 || error.statusCode === 401;
      
      if (trace) {
        traceService.addEvent(trace.traceId, 'llm_call', {
          status: 'error',
          error: error.message,
          errorType: isAuthError ? 'authentication' : 'other',
          willFallback: true,
        });
        traceService.addEvent(trace.traceId, 'fallback', {
          status: 'triggered',
          reason: isAuthError ? 'LLM authentication failed' : 'LLM error/limit exceeded',
          fallbackTo: 'dialog_tree',
        });
      }
      
      if (error instanceof LLMError && error.shouldFallback) {
        if (isAuthError) {
          console.warn('[ChatService] LLM authentication failed (invalid API key). Falling back to dialog tree.');
        } else {
          console.warn('[ChatService] LLM limit/quota exceeded. Falling back to dialog tree.');
        }
        if (nextNode && nextNode.bot_response) {
          botResponse = nextNode.bot_response;
          finalNodeId = nextNode.id; // Set node ID so options will be generated
          useLLMResponse = false; // Using dialog tree, show options
        } else {
          // No dialog tree match, use generic response but try to get options from current node
          botResponse = "I'm here to help you. Could you tell me more about what you're looking for?";
          finalNodeId = session.current_node_id; // Keep current node to show its options
          useLLMResponse = false;
        }
      } else if (isLLMLimitError(error)) {
        // Handle non-LLMError objects that are limit errors
        console.warn('[ChatService] LLM limit exceeded. Falling back to dialog tree.');
        if (nextNode && nextNode.bot_response) {
          botResponse = nextNode.bot_response;
          finalNodeId = nextNode.id;
          useLLMResponse = false;
        } else {
          botResponse = "I'm here to help you. Could you tell me more about what you're looking for?";
          finalNodeId = session.current_node_id;
          useLLMResponse = false;
        }
      } else {
        // Other LLM errors (including auth errors) - try dialog tree fallback with options
        if (isAuthError) {
          console.warn('[ChatService] LLM authentication failed (invalid API key). Falling back to dialog tree.');
        } else {
          console.warn('[ChatService] LLM error. Falling back to dialog tree.');
        }
        if (nextNode && nextNode.bot_response) {
          botResponse = nextNode.bot_response;
          finalNodeId = nextNode.id;
          useLLMResponse = false;
        } else {
          botResponse = "I'm here to help you. Could you tell me more about what you're looking for?";
          finalNodeId = session.current_node_id;
          useLLMResponse = false;
        }
      }
    }
  } else if (nextNode) {
    // Fallback to dialog tree if no credits available (simple bot mode)
    console.log('[ChatService] Using simple dialog tree bot (no credits available)');
    botResponse = nextNode.bot_response || "I'm here to help!";
    finalNodeId = nextNode.id;
    useLLMResponse = false; // Using dialog tree, show options
  } else {
    // No dialog node match found - use generic response
    botResponse = "I'm not sure how to help with that. Could you rephrase your question?";
    finalNodeId = session.current_node_id;
    useLLMResponse = false;
  }

  // Update session to current node if we matched a dialog node
  if (finalNodeId && nextNode && finalNodeId === nextNode.id) {
    await updateSessionNode(session.session_id, finalNodeId);
  }

  // Store the bot response in user memory for context
  // IMPORTANT: Always save user memory when userId is provided, regardless of LLM usage
  if (userId && useMemory) {
    try {
      await extractAndStoreUserInfo(userId, userMessage, botResponse);
      console.log(`[ChatService] Saved user memory for userId: ${userId}`);
    } catch (error: any) {
      console.error('[ChatService] Error storing bot response in memory:', error.message);
      // Don't throw - continue with conversation even if memory storage fails
    }
  }

  // Log conversation (always logged, regardless of userId)
  await logConversation(
    session.session_id,
    treeId,
    finalNodeId,
    userMessage,
    botResponse
  );

  // Get child nodes for quick reply options
  // IMPORTANT: Don't show dialog tree options if we have strong memory context
  // This allows the AI to provide a direct, personalized answer instead of asking follow-up questions
  let options: string[] | undefined;
  
  // Only return dialog tree options if:
  // 1. We don't have strong memory context (let dialog tree guide the conversation)
  // 2. We're not using LLM (fallback to dialog tree)
  // 3. User explicitly wants to follow dialog tree flow
  if (!hasStrongMemoryContext || !useLLMResponse) {
    if (finalNodeId) {
      const childNodes = allNodes.filter(node => node.parent_id === finalNodeId);
      options = childNodes
        .filter(node => node.user_input)
        .slice(0, 3)
        .map(node => node.user_input!);
    }
    
    // If we have a matched node but finalNodeId doesn't match, use the matched node for options
    if ((!options || options.length === 0) && nextNode && nextNode.id) {
      const childNodes = allNodes.filter(node => node.parent_id === nextNode.id);
      options = childNodes
        .filter(node => node.user_input)
        .slice(0, 3)
        .map(node => node.user_input!);
    }
  } else {
    // Strong memory context + LLM response = no dialog tree options
    // The AI response should be complete and personalized
    console.log('[ChatService] 🎯 Skipping dialog tree options - using personalized LLM response instead');
    if (trace) {
      traceService.addEvent(trace.traceId, 'final_response', {
        skippedDialogTreeOptions: true,
        reason: 'Strong memory context - providing direct personalized answer',
      });
    }
  }

  // Complete trace
  if (trace) {
    traceService.addEvent(trace.traceId, 'final_response', {
      response: botResponse,
      nextNodeId: finalNodeId,
      options: options || [],
    });
    traceService.completeTrace(trace.traceId, botResponse);
  }

  return {
    bot_response: botResponse,
    next_node_id: finalNodeId,
    session_id: session.session_id,
    options: options && options.length > 0 ? options : undefined,
    trace_id: trace?.traceId, // Include trace ID in response
  };
}

// Get conversation history
export async function getConversationHistory(sessionId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM conversation_history 
     WHERE session_id = $1 
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}

// Reset session (start over)
export async function resetSession(sessionId: string): Promise<void> {
  await pool.query(
    'UPDATE conversation_sessions SET current_node_id = NULL, updated_at = NOW() WHERE session_id = $1',
    [sessionId]
  );
}
