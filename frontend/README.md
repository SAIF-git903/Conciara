# Dialog Tree Frontend

Modern React/Next.js frontend for managing dialog trees with a beautiful UI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Features

- **Tree Management**: Create, edit, and delete dialog trees
- **Preprompt Editor**: Manage system prompts for each tree
- **Node Editor**: Create hierarchical dialog nodes with user inputs and bot responses
- **Tree Visualization**: Interactive tree view using react-d3-tree
- **Vector Embeddings**: Automatic embedding generation for nodes (via backend)
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios
- react-d3-tree
- Lucide React (icons)

