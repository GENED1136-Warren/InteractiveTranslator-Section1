#!/bin/bash

echo "Testing full translation and chat flow..."
echo "========================================="

# Test 1: Translation
echo -e "\n1. Testing translation endpoint..."
TRANSLATION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/segment-and-translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "君子以德治國。小人以力服人。",
    "inputLanguage": "ancient",
    "outputLanguages": ["modern", "english"],
    "model": "sonnet"
  }')

if echo "$TRANSLATION_RESPONSE" | grep -q "<s1>"; then
  echo "✅ Translation successful"
  echo "$TRANSLATION_RESPONSE" | python3 -m json.tool | head -20
else
  echo "❌ Translation failed"
  echo "$TRANSLATION_RESPONSE"
fi

# Test 2: Query endpoint
echo -e "\n2. Testing query endpoint..."
QUERY_RESPONSE=$(curl -s -X POST http://localhost:3001/api/query-claude \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "君子以德治國。小人以力服人。",
    "highlightedSentence": "君子以德治國",
    "userQuestion": "What does this mean?",
    "conversationHistory": [],
    "model": "sonnet"
  }')

if echo "$QUERY_RESPONSE" | grep -q "response"; then
  echo "✅ Query successful"
  echo "$QUERY_RESPONSE" | python3 -m json.tool | head -10
else  
  echo "❌ Query failed"
  echo "$QUERY_RESPONSE"
fi

echo -e "\n========================================="
echo "Testing complete!"