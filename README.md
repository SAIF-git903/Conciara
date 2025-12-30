# Dialog Tree Manager

A full-stack application for creating, editing, and managing dialog trees with vector embeddings. Built with Node.js/Express backend and Next.js/React frontend.

## Project Structure

```
wine_v2/
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
    └── package.json
```

## Features

- **Dialog Tree Management**: Create, edit, and delete dialog trees
- **Preprompt Editor**: Manage system prompts for each tree
- **Hierarchical Nodes**: Create parent-child relationships between dialog nodes
- **Vector Embeddings**: Automatic embedding generation using OpenAI
- **Tree Visualization**: Interactive tree view with react-d3-tree
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+ with pgvector extension
- OpenAI API key (for embeddings)

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
DATABASE_URL=postgresql://user:password@localhost:5432/dialog_trees
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

5. Run database migrations:
```bash
npm run migrate
```

6. Start the development server:
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

The application will be available at `http://localhost:3000`

## Database Schema

### dialog_trees
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `description` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### dialog_nodes
- `id` (SERIAL PRIMARY KEY)
- `tree_id` (INT, FK to dialog_trees)
- `parent_id` (INT, FK to dialog_nodes, nullable)
- `user_input` (TEXT, nullable)
- `bot_response` (TEXT, nullable)
- `vector_embedding` (VECTOR(1536))
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### preprompts
- `id` (SERIAL PRIMARY KEY)
- `tree_id` (INT, FK to dialog_trees)
- `content` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

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

### Preprompts
- `GET /api/preprompt/tree/:treeId` - Get preprompt for a tree
- `POST /api/preprompt` - Create or update preprompt
- `DELETE /api/preprompt/:id` - Delete preprompt

## Tech Stack

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL with pgvector
- OpenAI API (for embeddings)

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios
- react-d3-tree
- Lucide React

## Development

Both backend and frontend support hot-reload during development. Make sure both servers are running simultaneously for full functionality.

## License

ISC

