# Dialog Tree Backend API

Backend API for managing dialog trees, nodes, and preprompts with PostgreSQL and vector embeddings.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials and OpenAI API key.

4. Run migrations to create database tables:
```bash
npm run migrate
```

5. Start the development server:
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

### Preprompts
- `GET /api/preprompt/tree/:treeId` - Get preprompt for a tree
- `POST /api/preprompt` - Create or update preprompt
- `DELETE /api/preprompt/:id` - Delete preprompt

## Database Requirements

- PostgreSQL with pgvector extension
- Vector dimension: 1536 (OpenAI text-embedding-ada-002)

