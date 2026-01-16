# ConversaTree Frontend

Modern React/Next.js frontend for managing dialog trees, user memory, and chatbot widgets.

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

### Admin Interface
- **Tree Management**: Create, edit, and delete dialog trees
- **Node Editor**: Create hierarchical dialog nodes with user inputs and bot responses
- **Preprompt Editor**: Manage system prompts for LLM-powered responses
- **Tree Visualization**: Interactive tree view using react-d3-tree
- **Skin Management**: Configure themes and A/B variations

### Widget
- **Standalone Widget**: Embeddable JavaScript widget (no iframe needed)
- **Data-Driven UI**: Dynamic theming from database configuration
- **User Memory Integration**: Supports personalized conversations
- **Auto-Configuration**: Domain-based automatic setup

### Testing Pages
- **Memory Test**: Interactive testing of user memory system
- **Widget Demo**: Live widget demonstration with configuration

## Tech Stack

- **Framework**: Next.js 14
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Visualization**: react-d3-tree
- **Icons**: Lucide React

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main admin dashboard
│   ├── memory-test/       # User memory testing page
│   └── widget-demo/       # Widget demonstration page
├── components/             # React components
│   ├── DialogTreeManager.tsx  # Main tree management component
│   ├── ChatbotWidget.tsx      # React widget component
│   ├── SkinRenderer.tsx       # Data-driven UI renderer
│   └── ...
├── lib/                    # Utilities
│   └── api.ts             # API client
├── public/                 # Static assets
│   └── widget.js          # Standalone embeddable widget
└── types/                  # TypeScript types
```

## Building the Widget

The standalone widget (`public/widget.js`) is a self-contained JavaScript file that can be embedded on any website. It includes:

- Automatic configuration detection
- Dynamic theming from database
- User memory support
- No external dependencies (except API calls)

## Development

The frontend supports hot-reload during development. Make sure the backend API is running at `http://localhost:3001` for full functionality.
