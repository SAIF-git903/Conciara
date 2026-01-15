# Testing Guide for User Memory System

## Quick Start

### 1. Check Available Trees

First, see what dialog trees exist in your database:

```bash
cd backend
npm run list-trees
```

This will show you all available `tree_id` values. Use one of these in your tests.

### 2. Run the Test Script

I've created a test script that uses the correct tree_id:

```bash
# Make sure backend server is running first!
cd backend
npm run dev

# In another terminal, run the test:
./test_user_memory.sh
```

### 3. Manual Testing with curl

Use one of these tree_ids:
- **35**: Product Inquiry Flow (recommended for testing)
- **40**: Test Product Inquiry (simple test tree)

#### Test 1: Store User Profile

```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "tree_id": 35,
    "user_message": "I am a React programmer and I also do mobile development",
    "user_id": "john"
  }'
```

Save the `session_id` from the response.

#### Test 2: Add Constraints

```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "tree_id": 35,
    "user_message": "I am in Africa and have a limited budget",
    "user_id": "john",
    "session_id": "YOUR_SESSION_ID_FROM_TEST_1"
  }'
```

#### Test 3: Test Personalized Response

```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "tree_id": 35,
    "user_message": "I need a new laptop",
    "user_id": "john",
    "session_id": "YOUR_SESSION_ID_FROM_TEST_1"
  }'
```

**Expected**: Should get a personalized response like:
> "Get yourself an M3 Mac Laptop with 36 Gigs of Ram or more. Faster processor even better. Get the 16 inch screen."

### 4. Verify Memory in Database

Check what memories were stored:

```sql
-- Connect to your database
psql your_database_name

-- See all user memories
SELECT user_id, memory_type, content, metadata 
FROM user_memory 
ORDER BY created_at DESC;

-- See specific user's memories
SELECT memory_type, content, metadata 
FROM user_memory 
WHERE user_id = 'john'
ORDER BY created_at DESC;
```

## Troubleshooting

### Error: "tree_id does not exist"

**Solution**: Use `npm run list-trees` to see available tree_ids, then use one of those.

### Error: "OpenRouter API key not configured"

**Solution**: Make sure `backend/.env` has:
```env
USE_OPENROUTER=true
OPENROUTER_API_KEY=sk-or-v1-...
```

### Responses are not personalized

**Check**:
1. Is `user_id` being passed in the request?
2. Is `use_memory` set to `true` (default)?
3. Are memories being stored? (check database)
4. Is OpenRouter API key configured?

### Memory not being stored

**Check**:
1. Database connection is working
2. Migration has been run (`npm run migrate`)
3. `user_memory` table exists
4. Check server logs for errors

## Available Commands

```bash
# List all dialog trees
npm run list-trees

# Create a simple test tree
npm run create-test-tree

# Seed database with sample data
npm run seed

# Run migrations
npm run migrate
```

## Expected Behavior

### With Memory Enabled (default)

1. **First message**: Extracts user info, stores in memory, responds
2. **Second message**: Retrieves relevant memories, generates personalized response
3. **Responses**: Concise (1-2 sentences), personalized based on user context

### With Memory Disabled

```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "tree_id": 35,
    "user_message": "I need a laptop",
    "user_id": "john",
    "use_memory": false
  }'
```

This will use dialog tree responses instead of personalized LLM responses.

## Test Scenarios

### Scenario 1: React Programmer (John)

```bash
# Message 1
"I am a React programmer and mobile developer"
→ Stores: profession=programmer, technologies=[react, mobile]

# Message 2
"I am in Africa, budget is limited"
→ Stores: location=Africa, constraint=budget limited

# Message 3
"I need a laptop"
→ Should recommend: Mac (React + mobile), affordable (budget), high RAM (programmer)
```

### Scenario 2: Gamer Accountant (Steve)

```bash
# Message 1
"I play Fortnite and Call of Duty. I am an accountant"
→ Stores: interests=[gaming], profession=accountant

# Message 2
"I need a computer"
→ Should recommend: RTX GPU laptop (gaming), Windows OK (accountant)
```

## Next Steps

1. ✅ Run `npm run migrate` to create tables
2. ✅ Run `npm run seed` to populate sample data
3. ✅ Start backend: `npm run dev`
4. ✅ Run test script: `./test_user_memory.sh`
5. ✅ Verify memories in database
6. ✅ Test personalized responses

