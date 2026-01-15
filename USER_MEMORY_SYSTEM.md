# User Memory System - Conversational Chatbot Architecture

## Overview

This document describes the new **User Memory System** that transforms the chatbot from a rigid dialog tree system into a **conversational, context-aware AI chatbot** that remembers user information and provides personalized, concise responses.

## Problem Statement

The previous system was:
- **Too verbose**: Throwing "the kitchen sink" at users with long conversations
- **Not conversational**: Following rigid dialog trees instead of natural conversation
- **No memory**: Not remembering user preferences, profession, constraints, or previous conversations
- **Not personalized**: Same responses for everyone regardless of context

## Solution: User Memory System

### Key Features

1. **User Profiles**: Store user information (name, email, metadata)
2. **User Memory**: Vector-based storage of user context (profession, preferences, constraints, conversation history)
3. **Semantic Search**: Retrieve relevant memories using embeddings
4. **LLM-Powered Responses**: Generate concise, personalized responses (1-2 sentences) based on user context
5. **Hybrid Approach**: Combine dialog trees with memory-driven responses

## Architecture

### Database Schema

#### `user_profiles` Table
```sql
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `user_memory` Table
```sql
CREATE TABLE user_memory (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  memory_type VARCHAR(50) NOT NULL, -- 'profile', 'preference', 'constraint', 'conversation', 'fact', 'knowledge'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  vector_embedding VECTOR(1536), -- For semantic search
  relevance_score FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Updated `conversation_sessions` Table
```sql
ALTER TABLE conversation_sessions 
ADD COLUMN user_id VARCHAR(255);
```

### Memory Types

1. **`profile`**: User profession, role, technologies (e.g., "React programmer", "mobile developer")
2. **`preference`**: User preferences (e.g., "prefers Mac", "needs 36GB RAM")
3. **`constraint`**: User constraints (e.g., "budget limited", "located in Africa")
4. **`conversation`**: Previous conversation context
5. **`fact`**: General facts about the user
6. **`knowledge`**: Domain knowledge relevant to the user

### Services

#### 1. `userMemoryService.ts`
- **`getOrCreateUserProfile(userId)`**: Get or create user profile
- **`updateUserProfile(userId, updates)`**: Update user profile metadata
- **`storeUserMemory(userId, type, content, metadata)`**: Store user memory with vector embedding
- **`retrieveUserMemories(userId, query, types, limit)`**: Semantic search for relevant memories
- **`getUserMemories(userId, types)`**: Get all memories for a user
- **`extractAndStoreUserInfo(userId, message, botResponse)`**: Extract user info from conversation
- **`buildUserContext(userId)`**: Build context string from all user memories

#### 2. `llmService.ts`
- **`generateContextualResponse(userMessage, userContext, productCatalog, maxLength)`**: Generate concise, personalized response (1-2 sentences)
- **`generateHybridResponse(userMessage, userContext, dialogTreeContext, productCatalog)`**: Combine dialog tree with user memory

#### 3. Updated `chatService.ts`
- **`processChatMessage(treeId, userMessage, sessionId, userId, useMemory)`**: 
  - Extracts user information from messages
  - Retrieves user context/memory
  - Generates personalized responses using LLM
  - Falls back to dialog trees if needed

## Usage

### API Request

```json
POST /api/chat/message
{
  "tree_id": 1,
  "user_message": "I need a new laptop",
  "session_id": "session_123",
  "user_id": "john_doe",  // NEW: User identifier
  "use_memory": true       // NEW: Enable memory (default: true)
}
```

### Example Flow

1. **User says**: "I need a new laptop"
2. **System extracts**: 
   - Checks if user mentioned profession, preferences, constraints
   - Stores in `user_memory` with appropriate type
3. **System retrieves**:
   - All user memories (profile, preferences, constraints)
   - Relevant memories for "laptop" query
4. **System generates**:
   - If user is "React programmer" + "mobile developer" + "budget limited":
     - Response: "Get yourself an M3 Mac Laptop with 36 Gigs of Ram or more. Faster processor even better. Get the 16 inch screen."
   - If user is "gamer" + "accountant":
     - Response: "Get a 3060 RTX laptop with 16 gigs Ram or faster."
5. **System stores**: Conversation in memory for future context

## Example Scenarios

### Scenario 1: React Programmer (John)

**Previous Conversations:**
- "I'm a React programmer"
- "I also do mobile development"
- "I'm in Africa, budget is limited"

**Current Query:** "I need a new laptop"

**System Memory:**
- Profile: React programmer, mobile developer
- Constraint: Budget limited, located in Africa
- Preference: Mac (inferred from React + mobile)

**Generated Response:**
> "Get yourself an M3 Mac Laptop with 36 Gigs of Ram or more. Faster processor even better. Get the 16 inch screen."

**Why:**
- React + mobile → Mac (Windows eliminated)
- Budget limited → Used/affordable options
- Programmer → High RAM requirement (36GB)

### Scenario 2: Gamer Accountant (Steve)

**Previous Conversations:**
- "I play Fortnite and Call of Duty"
- "I'm an accountant"
- "I speak Urdu (Pakistan)"

**Current Query:** "I need a new computer"

**System Memory:**
- Profile: Gamer, accountant
- Preference: Gaming laptops

**Generated Response:**
> "Get a 3060 RTX laptop with 16 gigs Ram or faster."

**Why:**
- Gamer → RTX GPU for gaming
- Accountant → Doesn't need Mac (can use Windows)
- Gaming focus → GPU prioritized over other specs

## Configuration

### Environment Variables

```env
# OpenRouter (for LLM and embeddings)
USE_OPENROUTER=true
OPENROUTER_API_KEY=sk-or-v1-...

# Or OpenAI directly
OPENAI_API_KEY=sk-...
```

### Migration

Run the migration to create new tables:

```bash
cd backend
npm run migrate
```

Or if using setup:

```bash
npm run setup-db
```

## Benefits

1. **Conversational**: Responses are natural, like talking to a friend
2. **Concise**: 1-2 sentences instead of long conversations
3. **Personalized**: Uses user's profession, preferences, constraints
4. **Memory**: Remembers previous conversations and user information
5. **Context-Aware**: Retrieves relevant memories for each query
6. **Flexible**: Hybrid approach supports both memory-driven and tree-based responses

## Future Enhancements

1. **Product Catalog Integration**: Store product information in vector DB for semantic search
2. **Multi-User Support**: Support multiple users per session
3. **Memory Pruning**: Remove outdated or irrelevant memories
4. **Memory Confidence**: Score memories by relevance and recency
5. **Conversation Summarization**: Summarize long conversations into key facts

## Testing

### Test User Memory Extraction

```bash
# Test with user_id
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "tree_id": 1,
    "user_message": "I am a React programmer and I need a laptop",
    "user_id": "test_user_1"
  }'
```

### Test Memory Retrieval

```bash
# Second message should use memory from first
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "tree_id": 1,
    "user_message": "What do you recommend?",
    "user_id": "test_user_1",
    "session_id": "session_from_first_request"
  }'
```

## Notes

- Memory is **opt-in**: Set `use_memory: false` to disable
- User ID is **optional**: System works without user_id (falls back to dialog trees)
- Vector embeddings require **pgvector extension**
- LLM responses require **OpenAI or OpenRouter API key**

