#!/bin/bash

# Test script for User Memory System
# Uses tree_id=35 (Product Inquiry Flow) which exists in the database

API_URL="http://localhost:3001/api"
TREE_ID=35  # Product Inquiry Flow

echo "🧪 Testing User Memory System"
echo "Using tree_id=$TREE_ID (Product Inquiry Flow)"
echo ""

# Test 1: Store user profile (React programmer)
echo "1️⃣  Storing user profile (React programmer)..."
RESPONSE1=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"tree_id\": $TREE_ID,
    \"user_message\": \"I am a React programmer and I also do mobile development\",
    \"user_id\": \"john\"
  }")

SESSION_ID=$(echo $RESPONSE1 | jq -r '.session_id')
BOT_RESPONSE1=$(echo $RESPONSE1 | jq -r '.bot_response')

echo "Session ID: $SESSION_ID"
echo "Bot Response: $BOT_RESPONSE1"
echo ""

# Test 2: Add constraints (budget, location)
echo "2️⃣  Adding constraints (budget, location)..."
RESPONSE2=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"tree_id\": $TREE_ID,
    \"user_message\": \"I am in Africa and have a limited budget\",
    \"user_id\": \"john\",
    \"session_id\": \"$SESSION_ID\"
  }")

BOT_RESPONSE2=$(echo $RESPONSE2 | jq -r '.bot_response')
echo "Bot Response: $BOT_RESPONSE2"
echo ""

# Test 3: Test personalized response (should recommend Mac)
echo "3️⃣  Testing personalized response (should recommend Mac based on memory)..."
RESPONSE3=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"tree_id\": $TREE_ID,
    \"user_message\": \"I need a new laptop\",
    \"user_id\": \"john\",
    \"session_id\": \"$SESSION_ID\"
  }")

BOT_RESPONSE3=$(echo $RESPONSE3 | jq -r '.bot_response')
echo "Bot Response: $BOT_RESPONSE3"
echo ""

# Test 4: Different user (gamer)
echo "4️⃣  Testing with different user (gamer)..."
RESPONSE4=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"tree_id\": $TREE_ID,
    \"user_message\": \"I play Fortnite and Call of Duty. I am an accountant\",
    \"user_id\": \"steve\"
  }")

SESSION_ID2=$(echo $RESPONSE4 | jq -r '.session_id')
BOT_RESPONSE4=$(echo $RESPONSE4 | jq -r '.bot_response')
echo "Session ID: $SESSION_ID2"
echo "Bot Response: $BOT_RESPONSE4"
echo ""

# Test 5: Gamer needs computer (should recommend RTX)
echo "5️⃣  Testing personalized response for gamer (should recommend RTX)..."
RESPONSE5=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"tree_id\": $TREE_ID,
    \"user_message\": \"I need a new computer\",
    \"user_id\": \"steve\",
    \"session_id\": \"$SESSION_ID2\"
  }")

BOT_RESPONSE5=$(echo $RESPONSE5 | jq -r '.bot_response')
echo "Bot Response: $BOT_RESPONSE5"
echo ""

echo "✅ Test complete!"
echo ""
echo "📊 Summary:"
echo "  - John (React programmer): Should get Mac recommendation"
echo "  - Steve (Gamer): Should get RTX laptop recommendation"
echo ""
echo "💡 Check the database to see stored memories:"
echo "   npm run list-trees  # See available trees"
echo "   # Or query: SELECT * FROM user_memory WHERE user_id IN ('john', 'steve');"

