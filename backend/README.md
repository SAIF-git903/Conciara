# ConversaTree Backend API

Backend API for managing dialog trees, user memory, chatbot conversations, and widget configuration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/conversatree
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

4. Run migrations to create database tables:
```bash
npm run migrate
```

5. (Optional) Seed the database with sample data:
```bash
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Dialog Trees
- `GET /api/dialog-tree` - Get all dialog trees
- `GET /api/dialog-tree/:id` - Get dialog tree by ID
- `POST /api/dialog-tree` - Create new dialog tree
- `PUT /api/dialog-tree/:id` - Update dialog tree
- `DELETE /api/dialog-tree/:id` - Delete dialog tree

### Dialog Nodes
- `GET /api/dialog-node/tree/:treeId` - Get all nodes for a tree
- `GET /api/dialog-node/:id` - Get node by ID
- `POST /api/dialog-node` - Create new dialog node
- `PUT /api/dialog-node/:id` - Update dialog node
- `DELETE /api/dialog-node/:id` - Delete dialog node

### Chat
- `POST /api/chat/message` - Process chat message (supports user memory)

### Widget Configuration
- `GET /api/widget/config` - Get widget configuration (auto-detects by domain, websiteId, or skinId)

### Preprompts
- `GET /api/preprompt/tree/:treeId` - Get preprompt for a tree
- `POST /api/preprompt` - Create or update preprompt
- `DELETE /api/preprompt/:id` - Delete preprompt

### Skins & Variations
- `GET /api/skin` - Get all skins
- `GET /api/skin/:id` - Get skin by ID
- `POST /api/skin` - Create skin
- `PUT /api/skin/:id` - Update skin
- `DELETE /api/skin/:id` - Delete skin
- `GET /api/ab-variation` - Get all variations
- `POST /api/ab-variation` - Create variation

## Key Features

### User Memory System
- Automatic extraction of user context (profession, preferences, constraints)
- Vector-based semantic search for memory retrieval
- LLM-powered personalized responses
- Hybrid approach: combines dialog trees with memory-driven responses

### Semantic Matching
- Uses pgvector for similarity search
- Multiple matching strategies (exact, partial, semantic, keyword)
- Product keyword validation
- Backtracking support for context switching

### Embedding Generation
- Automatic embedding generation for dialog nodes using OpenAI
- Graceful fallback if embeddings unavailable

## Database Requirements

- PostgreSQL 12+ with pgvector extension
- Vector dimension: 1536 (OpenAI text-embedding-ada-002)

## Useful Commands

```bash
npm run migrate              # Run database migrations
npm run seed                # Seed database with sample data
npm run regenerate-embeddings  # Regenerate embeddings for all nodes
npm run list-trees           # List all dialog trees
npm run create-test-tree     # Create a test dialog tree
npm run test-profile         # Test user profile creation
```

## Services

- **chatService**: Core chat message processing with memory integration
- **dialogService**: Dialog tree and node management
- **userMemoryService**: User profile and memory management
- **llmService**: LLM-powered response generation
- **embeddingService**: Vector embedding generation
- **skinService**: Skin and variation management
