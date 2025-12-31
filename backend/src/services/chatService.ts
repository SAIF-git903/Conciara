import { pool } from '../db/connection.js';
import { getNodesByTreeId, getNodeById, DialogNode } from './dialogService.js';
import { generateEmbedding } from './embeddingService.js';

export interface ChatSession {
  session_id: string;
  tree_id: number;
  current_node_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  bot_response: string;
  next_node_id: number | null;
  session_id: string;
  options?: string[]; // Quick reply options
}

// Generate unique session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create session
export async function getOrCreateSession(
  sessionId: string | null,
  treeId: number
): Promise<ChatSession> {
  if (sessionId) {
    const result = await pool.query(
      'SELECT * FROM conversation_sessions WHERE session_id = $1',
      [sessionId]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }

  // Create new session
  const newSessionId = sessionId || generateSessionId();
  const result = await pool.query(
    `INSERT INTO conversation_sessions (session_id, tree_id, current_node_id)
     VALUES ($1, $2, NULL) RETURNING *`,
    [newSessionId, treeId]
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

// Find matching node based on user input
async function findMatchingNode(
  userMessage: string,
  currentNode: DialogNode | null,
  allNodes: DialogNode[]
): Promise<DialogNode | null> {
  if (!currentNode) {
    // Starting conversation - return root node
    return getRootNode(allNodes);
  }

  // Get child nodes of current node
  const childNodes = allNodes.filter(node => node.parent_id === currentNode.id);

  if (childNodes.length === 0) {
    return null; // No more nodes in this path
  }

  const userMessageLower = userMessage.toLowerCase().trim();

  // Strategy 1: Exact match on user_input
  const exactMatch = childNodes.find(node => {
    if (!node.user_input) return false;
    return node.user_input.toLowerCase().trim() === userMessageLower;
  });
  if (exactMatch) return exactMatch;

  // Strategy 2: Partial match (contains)
  const partialMatch = childNodes.find(node => {
    if (!node.user_input) return false;
    const nodeInputLower = node.user_input.toLowerCase();
    return nodeInputLower.includes(userMessageLower) || userMessageLower.includes(nodeInputLower);
  });
  if (partialMatch) return partialMatch;

  // Strategy 3: Keyword matching
  const userWords = userMessageLower.split(/\s+/);
  let bestMatch: DialogNode | null = null;
  let bestScore = 0;

  for (const node of childNodes) {
    if (!node.user_input) continue;
    
    const nodeInputLower = node.user_input.toLowerCase();
    const nodeWords = nodeInputLower.split(/\s+/);
    
    // Count matching words
    const matchingWords = userWords.filter(word => 
      nodeWords.some(nodeWord => nodeWord.includes(word) || word.includes(nodeWord))
    );
    const score = matchingWords.length / Math.max(userWords.length, nodeWords.length);
    
    if (score > bestScore && score > 0.3) { // At least 30% match
      bestScore = score;
      bestMatch = node;
    }
  }

  if (bestMatch) return bestMatch;

  // Strategy 4: Semantic matching using embeddings (if available)
  try {
    const userEmbedding = await generateEmbedding(userMessage);
    if (userEmbedding) {
      // Find node with most similar embedding
      // This would require vector similarity search (pgvector)
      // For now, we'll skip this and use fallback
    }
  } catch (error) {
    // Embeddings not available, continue to fallback
  }

  // Strategy 5: Fallback - return first child node with bot_response (default path)
  const defaultNode = childNodes.find(node => node.bot_response) || childNodes[0];
  return defaultNode || null;
}

// Process chat message
export async function processChatMessage(
  treeId: number,
  userMessage: string,
  sessionId: string | null
): Promise<ChatMessage> {
  // Get or create session
  const session = await getOrCreateSession(sessionId, treeId);

  // Get all nodes for this tree
  const allNodes = await getNodesByTreeId(treeId);

  // Handle initial start message
  if (userMessage === '__START__' || userMessage.trim() === '') {
    const rootNode = getRootNode(allNodes);
    if (rootNode && rootNode.bot_response) {
      await updateSessionNode(session.session_id, rootNode.id);
      await logConversation(
        session.session_id,
        treeId,
        rootNode.id,
        null,
        rootNode.bot_response
      );

      const childNodes = allNodes.filter(node => node.parent_id === rootNode.id);
      const options = childNodes
        .filter(node => node.user_input)
        .slice(0, 3)
        .map(node => node.user_input!);

      return {
        bot_response: rootNode.bot_response,
        next_node_id: rootNode.id,
        session_id: session.session_id,
        options: options.length > 0 ? options : undefined,
      };
    } else {
      return {
        bot_response: "Hello! I'm ready to help you.",
        next_node_id: null,
        session_id: session.session_id,
      };
    }
  }

  // Get current node (or null if starting)
  const currentNode = session.current_node_id
    ? await getNodeById(session.current_node_id)
    : null;

  // Find matching next node
  const nextNode = await findMatchingNode(userMessage, currentNode, allNodes);

  if (!nextNode) {
    // No matching node found
    const fallbackResponse = "I'm not sure how to help with that. Could you rephrase your question?";
    await logConversation(session.session_id, treeId, null, userMessage, fallbackResponse);
    
    return {
      bot_response: fallbackResponse,
      next_node_id: session.current_node_id, // Stay on current node
      session_id: session.session_id,
    };
  }

  // Update session to current node
  await updateSessionNode(session.session_id, nextNode.id);

  // Log conversation
  await logConversation(
    session.session_id,
    treeId,
    nextNode.id,
    userMessage,
    nextNode.bot_response || ''
  );

  // Get child nodes for quick reply options
  const childNodes = allNodes.filter(node => node.parent_id === nextNode.id);
  const options = childNodes
    .filter(node => node.user_input)
    .slice(0, 3) // Limit to 3 options
    .map(node => node.user_input!);

  return {
    bot_response: nextNode.bot_response || "I'm here to help!",
    next_node_id: nextNode.id,
    session_id: session.session_id,
    options: options.length > 0 ? options : undefined,
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

