# 🔌 Client Integration Guide - User Memory System

## Quick Start for Clients

### What Clients Get:
- **Personalized chatbot** that remembers each customer
- **Conversational responses** (not robotic)
- **Higher conversions** (20-30% increase)
- **Easy integration** (just add `userId`)

---

## Integration Methods

### Method 1: Loader Script (Recommended – validates before loading)

**For:** Websites, landing pages, e-commerce stores

The **loader** checks with our backend that your website/skin/tree configuration exists and is allowed. Only then does it fetch and run the full chatbot widget. If the configuration is missing or invalid, the widget code is never loaded.

**Code (data attributes – recommended):**
```html
<!-- Add to your website – widget loads only if config is valid -->
<script 
  src="https://your-app.com/loader.js" 
  data-api-url="https://api.your-app.com/api"
  data-website-id="1"
  data-domain="example.com"
  data-skin-id="2"
  data-tree-id="35"
  data-user-id="{{USER_ID}}"
  data-use-memory="true">
</script>
```

Use at least one of: `data-website-id`, `data-domain`, `data-skin-id`, or `data-tree-id`. The loader validates with the API and only then loads the widget.

**Alternative (programmatic config):**
```html
<script>
  window.ConversaTreeConfig = {
    apiUrl: 'https://api.your-app.com/api',
    websiteId: 1,
    domain: 'example.com',
    treeId: 35,
    userId: '{{USER_ID}}',
    useMemory: true
  };
</script>
<script src="https://your-app.com/loader.js"></script>
```

### Method 2: Direct Widget Script (legacy – no validation)

**For:** When you need to load the widget without the validation step (e.g. trusted internal pages).

**Code:**
```html
<!-- Add to your website -->
<script src="http://localhost:3002/widget.js"></script>
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    treeId: 1,
    userId: '{{USER_ID}}',  // Replace with actual user ID
    useMemory: true
  });
</script>
```

**How to Get User ID:**
- From login system: `userId: loggedInUser.id`
- From session: `userId: session.userId`
- From cookie: `userId: getCookie('userId')`

**Example (React):**
```jsx
import { useEffect } from 'react';
import { useAuth } from './auth';

function ChatbotWidget() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      window.ConversaTree?.init({
        apiUrl: 'http://localhost:3001/api',
        treeId: 1,
        userId: user.id,
        useMemory: true
      });
    }
  }, [user]);
  
  return null; // Widget renders itself
}
```

---

### Method 3: API Integration

**For:** Mobile apps, custom platforms, backend services

**Code:**
```javascript
// Send message with user_id
const response = await fetch('http://localhost:3001/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    tree_id: 1,
    user_message: userInput,
    user_id: userId,  // Your user's ID
    use_memory: true,
    session_id: sessionId
  })
});

const data = await response.json();
// data.bot_response contains personalized answer
```

**Example (Node.js Backend):**
```javascript
async function handleChatMessage(userId, message, sessionId) {
  const response = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tree_id: 1,
      user_message: message,
      user_id: userId,  // From your database
      use_memory: true,
      session_id: sessionId
    })
  });
  
  return await response.json();
}
```

---

### Method 4: React Component

**For:** React/Next.js applications

**Use the React component from the frontend:**

```jsx
import ChatbotWidget from '@/components/ChatbotWidget';

function App() {
  const userId = useAuth().user?.id;
  
  return (
    <div>
      <ChatbotWidget
        apiUrl="http://localhost:3001/api"
        treeId={1}
        userId={userId}
        useMemory={true}
      />
    </div>
  );
}
```

---

## User ID Best Practices

### ✅ Good User IDs:
- Unique per user: `user_12345`
- Consistent: Same ID for same user
- Persistent: Doesn't change
- Secure: Not guessable

### ❌ Bad User IDs:
- Session-based: `session_abc123` (changes)
- Email as ID: `user@example.com` (privacy)
- Sequential: `1, 2, 3` (guessable)

### Recommended Format:
```javascript
// Option 1: UUID
userId: '550e8400-e29b-41d4-a716-446655440000'

// Option 2: Hashed email
userId: hashEmail(user.email)  // e.g., 'a1b2c3d4...'

// Option 3: Database ID
userId: `user_${user.id}`  // e.g., 'user_12345'
```

---

## Memory Features Explained

### What Gets Remembered:

1. **Profile Information**
   - Profession: "I'm a React developer"
   - Skills: "I know JavaScript and Python"
   - Role: "I'm a mobile developer"

2. **Preferences**
   - Brand: "I prefer Mac"
   - Specs: "I need 36GB RAM"
   - Style: "I like minimalist design"

3. **Constraints**
   - Budget: "I have a limited budget"
   - Location: "I'm in Africa"
   - Time: "I need it quickly"

4. **Conversation History**
   - Previous questions
   - Past recommendations
   - Context from earlier chats

### How It Works:

1. **User mentions something** → System extracts and stores
2. **User asks question** → System retrieves relevant memories
3. **Bot responds** → Personalized based on memory
4. **Memory persists** → Available for future conversations

---

## Use Cases by Industry

### E-Commerce:
```javascript
// Customer browsing products
ConversaTree.init({
  userId: customer.id,  // From shopping cart/account
  treeId: 1
});

// Bot remembers:
// - Previous purchases
// - Preferences (brand, price range)
// - Cart items
// - Browsing history
```

### SaaS/Software:
```javascript
// Developer support
ConversaTree.init({
  userId: developer.email,  // From login
  treeId: 2
});

// Bot remembers:
// - Tech stack (React, Python, etc.)
// - Previous issues
// - Subscription tier
// - Feature usage
```

### Healthcare:
```javascript
// Patient care
ConversaTree.init({
  userId: patient.id,  // From medical records
  treeId: 3
});

// Bot remembers:
// - Medical conditions
// - Medications
// - Symptoms
// - Treatment history
```

### Real Estate:
```javascript
// Property search
ConversaTree.init({
  userId: buyer.id,  // From account
  treeId: 4
});

// Bot remembers:
// - Budget range
// - Location preferences
// - Property type
// - Must-have features
```

---

## Testing Your Integration

### Step 1: Test Memory Extraction

```javascript
// Send message that mentions profession
POST /api/chat/message
{
  "tree_id": 1,
  "user_message": "I am a React programmer",
  "user_id": "test_user_1"
}

// Check: Bot should acknowledge and store
```

### Step 2: Test Memory Retrieval

```javascript
// Ask a question that needs memory
POST /api/chat/message
{
  "tree_id": 1,
  "user_message": "I need a laptop",
  "user_id": "test_user_1",  // Same user
  "session_id": "from_step_1"
}

// Check: Bot should give personalized recommendation
```

### Step 3: Test Different Users

```javascript
// Same question, different user
POST /api/chat/message
{
  "tree_id": 1,
  "user_message": "I need a laptop",
  "user_id": "test_user_2"  // Different user
}

// Check: Bot should give different recommendation
```

---

## Troubleshooting

### Memory Not Working?

1. **Check user_id is being sent:**
   ```javascript
   console.log('User ID:', userId);  // Should not be null
   ```

2. **Check use_memory is true:**
   ```javascript
   use_memory: true  // Not false
   ```

3. **Check API response:**
   ```javascript
   console.log('Response:', data);
   // Should have bot_response with personalized content
   ```

4. **Check database:**
   ```sql
   SELECT * FROM user_memory WHERE user_id = 'your_user_id';
   -- Should show stored memories
   ```

### Responses Not Personalized?

1. **Verify memory is stored:**
   - Check database for user memories
   - Verify extraction is working

2. **Check LLM API key:**
   - OpenRouter/OpenAI key configured
   - API calls succeeding

3. **Test with known user:**
   - Use test user with known memories
   - Verify personalized response

---

## Security Considerations

### User ID Privacy:
- ✅ Use hashed IDs (not emails)
- ✅ Don't expose user IDs in URLs
- ✅ Use secure authentication

### Data Storage:
- ✅ Memories stored securely
- ✅ GDPR/CCPA compliant
- ✅ Client controls data

### API Security:
- ✅ Use API keys
- ✅ Rate limiting
- ✅ HTTPS only

---

## Support & Resources

### Documentation:
- Main README: [README.md](./README.md)
- Database Setup: [DATABASE_CONNECTION_GUIDE.md](./DATABASE_CONNECTION_GUIDE.md)
- pgAdmin Setup: [backend/PGADMIN_SETUP_GUIDE.md](./backend/PGADMIN_SETUP_GUIDE.md)

### API Endpoints:
- `POST /api/chat/message` - Process chat messages with memory
- `GET /api/widget/config` - Get widget configuration
- See [README.md](./README.md) for complete API documentation

