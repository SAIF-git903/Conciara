# Chatbot Testing Guide

## 🎉 What's Been Built

The chatbot execution system is now complete! Here's what was added:

1. **Database Tables**: `conversation_sessions` and `conversation_history`
2. **Chat Service**: Node matching logic with multiple strategies
3. **Chat API**: `/api/chat/message` endpoint
4. **Frontend Widget**: Reusable chatbot widget component
5. **Test Page**: Demo page to test the chatbot

## 🚀 How to Test

### Step 1: Start the Backend

```bash
cd backend
npm run dev
```

The server should start on `http://localhost:3001`

### Step 2: Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:3000`

### Step 3: Create a Dialog Tree

1. Go to `http://localhost:3000` (main app)
2. Navigate through the multi-tenant structure:
   - Select a Customer Type
   - Select a Website
   - Select a Skin
   - Select an A/B Variation
3. Create or select a Dialog Tree
4. Add nodes:
   - Create a root node with a bot response (e.g., "Welcome! How can I help?")
   - Add child nodes with user_input and bot_response
   - Example:
     - Root: "Welcome! Are you looking for help?"
     - Child 1: user_input="yes" → bot_response="Great! What do you need help with?"
     - Child 2: user_input="no" → bot_response="Okay, let me know if you need anything!"

### Step 4: Test the Chatbot

1. Go to `http://localhost:3000/chat-test`
2. Select the dialog tree you just created
3. Click the chat button in the bottom-right corner
4. Start chatting!

## 📡 API Endpoints

### POST `/api/chat/message`

Send a message to the chatbot.

**Request:**
```json
{
  "tree_id": 1,
  "user_message": "Hello",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "bot_response": "Welcome! How can I help?",
  "next_node_id": 5,
  "session_id": "session_1234567890_abc123",
  "options": ["Yes", "No"]
}
```

### GET `/api/chat/history/:sessionId`

Get conversation history for a session.

**Response:**
```json
[
  {
    "id": 1,
    "session_id": "session_123",
    "tree_id": 1,
    "node_id": 5,
    "user_message": "Hello",
    "bot_response": "Welcome!",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

### POST `/api/chat/reset`

Reset a conversation session to start over.

**Request:**
```json
{
  "session_id": "session_123"
}
```

## 🎨 Using the Widget on Your Website

### Option 1: Import in Next.js

```tsx
import ChatbotWidget from '@/components/ChatbotWidget'

export default function MyPage() {
  return (
    <div>
      <h1>My Website</h1>
      <ChatbotWidget
        apiUrl="http://localhost:3001/api"
        treeId={1}
        position="bottom-right"
        theme={{
          primaryColor: '#6366f1',
          backgroundColor: '#ffffff',
          textColor: '#1f2937'
        }}
      />
    </div>
  )
}
```

### Option 2: Standalone JavaScript (Future)

You can create a standalone widget that can be embedded on any website:

```html
<script src="https://your-api.com/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'https://your-api.com/api',
    treeId: 1
  })
</script>
```

## 🧠 How Node Matching Works

The chatbot uses multiple strategies to find the right response:

1. **Exact Match**: Matches user input exactly (case-insensitive)
2. **Partial Match**: Checks if input contains node text or vice versa
3. **Keyword Matching**: Finds nodes with matching keywords (30%+ match threshold)
4. **Semantic Matching**: Uses vector embeddings if available (future enhancement)
5. **Fallback**: Returns first available child node or default message

## 🔍 Testing Tips

1. **Exact Matches**: Use the exact text from "User Input" fields
2. **Partial Matches**: Try similar phrases or words
3. **Keywords**: Use key words from the user input fields
4. **Unmatched Input**: Try completely unrelated text to see fallback behavior
5. **Quick Replies**: Click the quick reply buttons for instant responses

## 📝 Next Steps

- [ ] Add semantic matching with vector embeddings
- [ ] Create standalone widget bundle
- [ ] Add conversation analytics
- [ ] Add typing indicators
- [ ] Add file/image upload support
- [ ] Add conversation export

## 🐛 Troubleshooting

**Chatbot not responding?**
- Check that backend is running on port 3001
- Check browser console for errors
- Verify the tree_id exists in database

**No messages appearing?**
- Check that the dialog tree has nodes
- Verify root node has a bot_response
- Check network tab for API errors

**Session not persisting?**
- Sessions are stored in database
- Each browser session gets a new session_id
- Sessions persist until manually reset

