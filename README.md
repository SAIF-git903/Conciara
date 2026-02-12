# ConversaTree

A full-stack conversational AI chatbot platform with user memory, semantic matching, and data-driven theming. Built with Node.js/Express backend and Next.js/React frontend.

## Project Structure

```
ConversaTree/
├── backend/          # Node.js/Express API server
│   ├── src/
│   │   ├── db/      # Database connection and migrations
│   │   ├── routes/  # API route handlers
│   │   ├── services/# Business logic and database operations
│   │   └── server.ts
│   └── package.json
│
└── frontend/         # Next.js/React frontend
    ├── app/         # Next.js app directory
    ├── components/  # React components
    ├── lib/         # API client and utilities
    ├── public/      # Static assets (widget.js)
    └── package.json
```

## Features

### Core Features
- **Dialog Tree Management**: Create, edit, and delete hierarchical dialog trees
- **Preprompt Editor**: Manage system prompts for LLM-powered responses
- **Vector Embeddings**: Automatic embedding generation using OpenAI
- **Semantic Matching**: Intelligent node matching using pgvector similarity search
- **Tree Visualization**: Interactive tree view with react-d3-tree

### Advanced Features
- **User Memory System**: Remember user context, preferences, and conversation history
- **LLM-Powered Responses**: Generate concise, personalized responses using OpenAI
- **Standalone Chatbot Widget**: Embeddable JavaScript widget (no iframe needed)
- **Data-Driven Theming**: Dynamic UI configuration via database (skins)
- **A/B Variation Testing**: Test different conversation flows and UI designs
- **Multi-Tenant Support**: Website-based configuration and isolation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+ with pgvector extension
- OpenAI API key (for embeddings and LLM)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/conversatree
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

5. Run database migrations:
```bash
npm run migrate
```

6. (Optional) Seed the database with sample data:
```bash
npm run seed
```

7. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3002`

## Widget Integration

### Basic Usage

```html
<script src="http://localhost:3002/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    treeId: 1,  // Your dialog tree ID
    userId: 'user-123',  // Optional: for user memory
    useMemory: true  // Optional: enable memory system
  });
</script>
```

### Domain-Based Auto-Configuration

```html
<script src="http://localhost:3002/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    domain: 'yourwebsite.com'  // Auto-detects website, skin, and tree
  });
</script>
```

## Database Schema

### Core Tables

**dialog_trees**
- `id`, `name`, `description`, `website_id`, `ab_variation_id`, `created_at`, `updated_at`

**dialog_nodes**
- `id`, `tree_id`, `parent_id`, `user_input`, `bot_response`, `vector_embedding`, `created_at`, `updated_at`

**preprompts**
- `id`, `tree_id`, `content`, `created_at`, `updated_at`

### User Memory Tables

**user_profiles**
- `id`, `user_id`, `name`, `email`, `metadata`, `created_at`, `updated_at`

**user_memory**
- `id`, `user_id`, `memory_type`, `content`, `metadata`, `vector_embedding`, `relevance_score`, `created_at`, `updated_at`

### Theming Tables

**websites**
- `id`, `name`, `domain`, `created_at`, `updated_at`

**skins**
- `id`, `website_id`, `name`, `description`, `theme_config`, `is_active`, `created_at`, `updated_at`

**ab_variations**
- `id`, `skin_id`, `name`, `description`, `variation_config`, `is_active`, `created_at`, `updated_at`

### Session Tables

**conversation_sessions**
- `id`, `session_id`, `tree_id`, `current_node_id`, `user_id`, `created_at`, `updated_at`

**conversation_history**
- `id`, `session_id`, `tree_id`, `node_id`, `user_message`, `bot_response`, `created_at`

## API Endpoints

### Dialog Trees
- `GET /api/dialog-tree` - Get all trees
- `GET /api/dialog-tree/:id` - Get tree by ID
- `POST /api/dialog-tree` - Create tree
- `PUT /api/dialog-tree/:id` - Update tree
- `DELETE /api/dialog-tree/:id` - Delete tree

### Dialog Nodes
- `GET /api/dialog-node/tree/:treeId` - Get nodes for a tree
- `GET /api/dialog-node/:id` - Get node by ID
- `POST /api/dialog-node` - Create node
- `PUT /api/dialog-node/:id` - Update node
- `DELETE /api/dialog-node/:id` - Delete node

### Chat
- `POST /api/chat/message` - Process chat message

### Widget Configuration
- `GET /api/widget/config?skinId=X` - Get widget configuration by skin ID
- `GET /api/widget/config?websiteId=X` - Get widget configuration by website ID
- `GET /api/widget/config?domain=example.com` - Get widget configuration by domain

### Preprompts
- `GET /api/preprompt/tree/:treeId` - Get preprompt for a tree
- `POST /api/preprompt` - Create or update preprompt
- `DELETE /api/preprompt/:id` - Delete preprompt

### Skins & Variations
- `GET /api/skin/website/:websiteId` - Get skins for a website
- `GET /api/skin/:id` - Get skin by ID
- `POST /api/skin` - Create skin
- `PUT /api/skin/:id` - Update skin
- `DELETE /api/skin/:id` - Delete skin
- `GET /api/ab-variation/skin/:skinId` - Get variations for a skin
- `GET /api/ab-variation/:id` - Get variation by ID
- `POST /api/ab-variation` - Create variation
- `PUT /api/ab-variation/:id` - Update variation
- `DELETE /api/ab-variation/:id` - Delete variation

### Websites & Customer Types
- `GET /api/website` - Get all websites
- `GET /api/website/:id` - Get website by ID
- `GET /api/website/customer-type/:customerTypeId` - Get websites by customer type
- `POST /api/website` - Create website
- `PUT /api/website/:id` - Update website
- `DELETE /api/website/:id` - Delete website
- `GET /api/customer-type` - Get all customer types
- `GET /api/customer-type/:id` - Get customer type by ID
- `POST /api/customer-type` - Create customer type
- `PUT /api/customer-type/:id` - Update customer type
- `DELETE /api/customer-type/:id` - Delete customer type

### Chat & Sessions
- `GET /api/chat/history/:sessionId` - Get conversation history
- `POST /api/chat/reset` - Reset conversation session

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL with pgvector extension
- **AI/ML**: OpenAI API (for embeddings and LLM)
- **Vector Search**: pgvector for semantic similarity

### Frontend
- **Framework**: Next.js 14
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Visualization**: react-d3-tree
- **Icons**: Lucide React

## Development

Both backend and frontend support hot-reload during development. Make sure both servers are running simultaneously for full functionality.

### Useful Commands

**Backend:**
```bash
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm run regenerate-embeddings  # Regenerate embeddings for all nodes
npm run list-trees   # List all dialog trees
```

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

## License

ISC
